import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  followUser,
  getFollowCounts,
  isFollowing,
  isValidHandle,
  resolveUserByHandle,
  unfollowUser,
} from "@/lib/follows";
import { isRateLimited, recordRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLLOW_MAX_PER_MINUTE = 120;
const FOLLOW_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get("handle");
  if (!handle || !isValidHandle(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }
  const target = await resolveUserByHandle(handle);
  if (!target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const session = await auth();
  const counts = await getFollowCounts(target.id);
  if (!session?.user?.id) {
    // Counts are public-safe; guests just don't carry follow identity.
    return NextResponse.json({
      isSelf: false,
      isFollowing: false,
      ...counts,
    });
  }
  const isSelf = target.id === session.user.id;
  return NextResponse.json({
    isSelf,
    isFollowing: isSelf ? false : await isFollowing(session.user.id, target.id),
    ...counts,
  });
}

async function respondTo(METHOD: "POST" | "DELETE", request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { handle?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const handle = typeof body?.handle === "string" ? body.handle.trim() : null;
  if (!handle || !isValidHandle(handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  const key = `follow:${session.user.id}`;
  if (await isRateLimited(key, FOLLOW_MAX_PER_MINUTE, FOLLOW_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const outcome =
    METHOD === "POST"
      ? await followUser(session.user.id, handle)
      : await unfollowUser(session.user.id, handle);
  if (!outcome.ok) {
    if (outcome.reason === "self") {
      return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });
    }
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await recordRateLimit(key);

  const target = await resolveUserByHandle(handle);
  const counts = target ? await getFollowCounts(target.id) : { followers: 0, following: 0 };
  return NextResponse.json({
    isFollowing: METHOD === "POST",
    ...counts,
  });
}

export function POST(request: Request) {
  return respondTo("POST", request);
}

export function DELETE(request: Request) {
  return respondTo("DELETE", request);
}