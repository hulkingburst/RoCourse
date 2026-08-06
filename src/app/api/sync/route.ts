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

  let payload: SyncPayload;
  try {
    payload = (await request.json()) as SyncPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload || typeof payload.progress !== "object" || payload.progress === null) {
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
