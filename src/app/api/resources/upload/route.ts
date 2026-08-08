import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { trustedIp } from "@/lib/auth-limiter";
import { MAX_ZIP_BYTES } from "@/lib/resources-shared";

export const runtime = "nodejs";
export const maxDuration = 15;

// Soft per-IP guard so the store can't be used as a free dumping ground.
const LIMIT_PER_IP = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const tokenRequests = new Map<string, number[]>();

export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  const now = Date.now();
  const recent = (tokenRequests.get(ip) ?? []).filter((t) => now - t < LIMIT_WINDOW_MS);
  if (recent.length >= LIMIT_PER_IP) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/zip",
          "application/x-zip-compressed",
          "application/octet-stream",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_ZIP_BYTES,
      }),
    });
    tokenRequests.set(ip, [...recent, now]);
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
