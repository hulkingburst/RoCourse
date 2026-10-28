import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCloudState,
  getCloudUpdatedAt,
  saveCloudState,
} from "@/lib/sync-api";
import { CONFLICT_TOLERANCE_MS } from "@/lib/sync-types";
import type { SyncPayload } from "@/lib/sync-types";
import { PRIVATE_JSON_HEADERS } from "@/lib/private-json";
import { isSameOriginRequest } from "@/lib/same-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Upper bound on a progress payload — progress is small; anything larger is abuse. */
const MAX_PAYLOAD_BYTES = 100 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const state = await getCloudState(session.user.id);
  return NextResponse.json(state, { headers: PRIVATE_JSON_HEADERS });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (raw.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: SyncPayload;
  try {
    payload = JSON.parse(raw) as SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Never silently overwrite newer cloud progress. The client resolves the
  // conflict with the user and retries with force: true.
  //
  // A forced push already is the client's answer to a conflict, so it skips the
  // watermark read entirely — there is nothing left to decide.
  if (!payload.force) {
    const clientTime = payload.lastUpdated ? Date.parse(payload.lastUpdated) : 0;
    const cloudTime = await getCloudUpdatedAt(session.user.id);
    if (Number.isFinite(clientTime) && cloudTime > clientTime + CONFLICT_TOLERANCE_MS) {
      const cloud = await getCloudState(session.user.id);
      return NextResponse.json({ conflict: true, cloud }, { status: 409 });
    }
  }

  await saveCloudState(session.user.id, payload);
  // Nothing reads the persisted state back: the pushing client already holds
  // this snapshot locally and only needs to know the write landed. Re-reading
  // the whole cloud state here was five more queries on every progress change,
  // and every caller discards the result. The next pull fetches it for real.
  return NextResponse.json({ ok: true });
}

function isValidPayload(payload: SyncPayload): boolean {
  if (!payload || typeof payload !== "object") return false;
  const progress = payload.progress as unknown;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return false;
  }
  if (payload.lastUpdated != null && typeof payload.lastUpdated !== "string") {
    return false;
  }
  if (
    payload.completions != null &&
    (!Array.isArray(payload.completions) || payload.completions.length > 100)
  ) {
    return false;
  }
  return true;
}
