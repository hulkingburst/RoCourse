import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { MAX_ZIP_BYTES } from "@/lib/resources-shared";

export const runtime = "nodejs";
export const maxDuration = 15;

// Per-IP guard so the store can't be used as a free dumping ground.
const LIMIT_PER_IP = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `resource-upload:${ip}`;

// A real ZIP archive starts with "PK\x03\x04" (local file header),
// "PK\x05\x06" (empty archive) or "PK\x07\x08" (spanned archive).
function isZipMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const [p, k, signature] = bytes;
  return (
    p === 0x50 &&
    k === 0x4b &&
    (signature === 0x03 || signature === 0x05 || signature === 0x07)
  );
}

// Reads only the first chunk of the uploaded blob and checks for a ZIP magic
// signature, so content is validated server-side without downloading the whole
// file (bounded even if the store ignores the Range header).
async function looksLikeZip(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-3" },
      cache: "no-store",
    });
    if (!response.ok || !response.body) return false;
    const reader = response.body.getReader();
    const { value } = await reader.read();
    reader.cancel().catch(() => {});
    if (!value) return false;
    return isZipMagic(value);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "Upload limit reached." }, { status: 429 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed." }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["application/zip", "application/x-zip-compressed"],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_ZIP_BYTES,
      }),
      onUploadCompleted: async ({ blob }) => {
        if (!(await looksLikeZip(blob.url))) {
          const token = process.env.BLOB_READ_WRITE_TOKEN;
          if (token) {
            try {
              await del(blob.url, { token });
            } catch {
              // Best-effort cleanup; the upload is rejected regardless.
            }
          }
          throw new Error("Uploaded file is not a ZIP archive.");
        }
      },
    });
    await recordRateLimit(limitKey(ip));
    await pruneRateLimits();
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[resource-upload]", error);
    return NextResponse.json(
      { ok: false, error: "Upload failed. Please try again." },
      { status: 400 }
    );
  }
}
