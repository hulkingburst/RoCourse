import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import {
  handleUpload,
  type HandleUploadBody,
} from "@vercel/blob/client";
import { trustedIp } from "@/lib/auth-limiter";
import { looksLikeZip } from "@/lib/zip-check";
import { fileStorage, issueR2Upload, r2ConfigError } from "@/lib/file-storage";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { MAX_ZIP_BYTES } from "@/lib/resources-shared";

export const runtime = "nodejs";
export const maxDuration = 15;

// Per-IP guard so the store can't be used as a free dumping ground.
const LIMIT_PER_IP = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

const limitKey = (ip: string) => `resource-upload:${ip}`;

export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "Upload limit reached." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: "Upload failed." }, { status: 400 });
  }

  // Storage probe: the client always asks for the backend before uploading.
  // On R2 this also issues the presigned PUT (recording the rate-limit row);
  // on Vercel it only reports the backend so the regular client flow can run.
  if ((body as { probe?: boolean }).probe) {
    if (fileStorage() === "r2") {
      const configError = r2ConfigError();
      if (configError) {
        return NextResponse.json({ ok: false, error: configError }, { status: 503 });
      }
      try {
        const filename =
          (body as { networkFilename?: string }).networkFilename ?? "file.zip";
        const { uploadUrl, fileUrl } = await issueR2Upload(filename);
        await recordRateLimit(limitKey(ip));
        await pruneRateLimits();
        return NextResponse.json({ ok: true, storage: "r2", uploadUrl, fileUrl });
      } catch (error) {
        console.error("[resource-upload:r2]", error);
        return NextResponse.json(
          { ok: false, error: "Upload failed. Please try again." },
          { status: 400 }
        );
      }
    }
    return NextResponse.json({ ok: true, storage: "vercel" });
  }

  try {
    const jsonResponse = await handleUpload({
      body: body as HandleUploadBody,
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