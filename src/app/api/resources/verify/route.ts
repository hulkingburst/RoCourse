import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { looksLikeZip } from "@/lib/zip-check";
import { deleteR2Object } from "@/lib/file-storage";
import { isAllowedFileHost } from "@/lib/resources-shared";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 15;

// Shares the upload bucket so verification can't bypass the per-IP guard.
const LIMIT_PER_IP = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `resource-upload:${ip}`;

export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { fileUrl?: unknown };
  try {
    body = (await request.json()) as { fileUrl?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
  if (!fileUrl.startsWith("https://")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let hostname: string;
  try {
    hostname = new URL(fileUrl).hostname;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!isAllowedFileHost(hostname)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!(await looksLikeZip(fileUrl))) {
    try {
      await deleteR2Object(fileUrl);
    } catch {
      // Best-effort cleanup; the upload is rejected regardless.
    }
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();
  return NextResponse.json({ ok: true });
}