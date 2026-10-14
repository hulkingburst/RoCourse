import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { sniffZip } from "@/lib/zip-check";
import {
  claimR2Upload,
  deleteR2ObjectByKey,
  r2KeyFromUrl,
  uploadKeyFromToken,
} from "@/lib/file-storage";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/same-origin";

export const runtime = "nodejs";
export const maxDuration = 15;

// Shares the upload bucket so verification can't bypass the per-IP guard.
const LIMIT_PER_IP = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `resource-upload:${ip}`;

/**
 * Confirms that the object a client just uploaded is a ZIP archive.
 *
 * This route is anonymous and its only power is over the object it was told
 * about, so it is deliberately paranoid:
 *
 *  - the URL must be on this deployment's R2 public host, and its key must be
 *    one this server issued a signed token for (see `uploadKeyFromToken`), so
 *    a caller can only ever act on an object it was handed;
 *  - a fetch that could not read the object is a rejection, never a delete:
 *    only a positive "these bytes are not a ZIP" answer may delete anything,
 *    and the delete target is the token's key, never the caller's URL;
 *  - a verified ZIP is *claimed* (moved out of the pending prefix) and the
 *    claimed URL is returned, which is what the submission stores. Anything
 *    left behind is reclaimed by the orphan sweep.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { fileUrl?: unknown; uploadToken?: unknown };
  try {
    body = (await request.json()) as { fileUrl?: unknown; uploadToken?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
  if (!fileUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let key: string;
  try {
    const url = new URL(fileUrl);
    const r2Host = process.env.R2_PUBLIC_HOST;
    // Fail closed: without a configured R2 host there is no object this route
    // is allowed to touch, so it touches none.
    if (!r2Host || url.hostname !== r2Host) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    key = r2KeyFromUrl(fileUrl);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // No token, a bad token, an expired one, or a key that was not issued by this
  // server: reject before any storage call. Nothing is deleted on this path.
  const ownedKey = uploadKeyFromToken(key, body.uploadToken);
  if (!ownedKey) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sniffed = await sniffZip(fileUrl);
  if (sniffed === "unreadable") {
    // The signed key says the object is ours, but the server could not read it.
    // That is not evidence of an invalid upload, so it is neither deleted nor
    // accepted.
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (sniffed === "not-zip") {
    try {
      await deleteR2ObjectByKey(ownedKey);
    } catch {
      // Best-effort cleanup; the upload is rejected regardless. The orphan
      // sweep reclaims it if this failed.
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let claimedUrl: string;
  try {
    claimedUrl = await claimR2Upload(ownedKey);
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();
  return NextResponse.json({ ok: true, fileUrl: claimedUrl });
}