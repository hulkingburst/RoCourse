import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type FileStorage = "vercel" | "r2";

/**
 * Active file storage backend. Defaults to "vercel" so the live site keeps
 * using Vercel Blob untouched; set FILE_STORAGE=r2 (plus the R2_* vars) to
 * route resource uploads through Cloudflare R2 instead.
 */
export function fileStorage(): FileStorage {
  return process.env.FILE_STORAGE === "r2" ? "r2" : "vercel";
}

/** Non-null when R2 uploads are requested but not fully configured. */
export function r2ConfigError(): string | null {
  const missing = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_HOST",
  ].filter((name) => !process.env[name]);
  return missing.length
    ? `R2 storage is not configured; missing ${missing.join(", ")}`
    : null;
}

function s3Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Object key from a public R2 URL (`https://<public-host>/<key>`). */
export function r2KeyFromUrl(fileUrl: string): string {
  const url = new URL(fileUrl);
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

/**
 * Issues a presigned PUT so the browser can upload the zip straight to the
 * bucket (the body never passes through the app server). Returns the signed
 * upload URL and the public URL stored in the submission.
 */
export async function issueR2Upload(
  filename: string
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const key = `resources/${randomUUID()}-${sanitizeR2Key(filename)}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: 15 * 60 });
  const fileUrl = `https://${process.env.R2_PUBLIC_HOST}/${key}`;
  return { uploadUrl, fileUrl, key };
}

/** Deletes one object by its public URL (used when validation fails). */
export async function deleteR2Object(fileUrl: string): Promise<void> {
  await s3Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: r2KeyFromUrl(fileUrl),
    })
  );
}

function sanitizeR2Key(filename: string): string {
  const base = filename
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return base || "file.zip";
}