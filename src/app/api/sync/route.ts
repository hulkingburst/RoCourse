import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getCloudState,
  getCloudUpdatedAt,
  saveCloudState,
} from "@/lib/sync-api";
import { CONFLICT_TOLERANCE_MS } from "@/lib/sync-types";
import type { SyncPayload } from "@/lib/sync-types";

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
  return NextResponse.json(state);
}

export async function POST(request: Request) {
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

  const clientTime = payload.lastUpdated ? Date.parse(payload.lastUpdated) : 0;
  const cloudTime = await getCloudUpdatedAt(session.user.id);

  // Never silently overwrite newer cloud progress. The client resolves the
  // conflict with the user and retries with force: true.
  if (
    !payload.force &&
    Number.isFinite(clientTime) &&
    cloudTime > clientTime + CONFLICT_TOLERANCE_MS
  ) {
    const cloud = await getCloudState(session.user.id);
    return NextResponse.json({ conflict: true, cloud }, { status: 409 });
  }

  await saveCloudState(session.user.id, payload);
  const cloud = await getCloudState(session.user.id);
  return NextResponse.json({ ok: true, cloud });
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
