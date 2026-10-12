import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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

/**
 * Every presigned upload is issued under this prefix. Objects live here until
 * they have been verified, which is what makes an abandoned upload
 * distinguishable from a claimed resource: nothing else is ever written here,
 * and the sweep below only ever looks here.
 */
const PENDING_PREFIX = "resources/pending/";

/** Where a verified upload is moved, i.e. the path a submission references. */
const CLAIMED_PREFIX = "resources/";

/** Signed-upload token: `r2u1.<expiresAtMs>.<hmac>`. */
const UPLOAD_TOKEN_PREFIX = "r2u1";
/** How long the client has to verify the upload it was issued a token for. */
const UPLOAD_TOKEN_TTL_MS = 30 * 60 * 1000;
/** How long an unverified upload is kept before the sweep reclaims it. */
const ORPHAN_TTL_MS = 24 * 60 * 60 * 1000;
/** Sweep throttle: at most one listing pass per process per hour. */
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
let lastSweepAt = 0;

/** Object key from a public R2 URL (`https://<public-host>/<key>`). */
export function r2KeyFromUrl(fileUrl: string): string {
  const url = new URL(fileUrl);
  return decodeURIComponent(url.pathname.replace(/^\//, ""));
}

function r2PublicUrl(key: string): string {
  return `https://${process.env.R2_PUBLIC_HOST}/${key}`;
}

/**
 * The HMAC key for upload tokens. R2's own secret is used because a token is
 * only ever issued and checked when R2 uploads are configured at all, so no
 * second secret has to be deployed and kept in sync.
 */
function uploadTokenSecret(): string {
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) throw new Error("R2 storage is not configured");
  return secret;
}

function uploadSignatureInput(key: string, expiresAt: number): string {
  return `${UPLOAD_TOKEN_PREFIX}:${key}:${expiresAt}`;
}

function signUploadKey(key: string, expiresAt: number): string {
  const signature = createHmac("sha256", uploadTokenSecret())
    .update(uploadSignatureInput(key, expiresAt))
    .digest("hex");
  return `${UPLOAD_TOKEN_PREFIX}.${expiresAt}.${signature}`;
}

/**
 * Proof that the caller was handed the presigned PUT for `key`, or null when
 * the token is missing, malformed, expired, or signed for a different key (or
 * one outside the pending prefix). This is the only thing that authorizes a
 * delete: the delete target is the key the token proves, never a URL a caller
 * supplied.
 */
export function uploadKeyFromToken(
  key: string,
  token: unknown,
  now: number = Date.now()
): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [prefix, rawExpires, signature] = parts;
  if (prefix !== UPLOAD_TOKEN_PREFIX) return null;
  const expiresAt = Number(rawExpires);
  if (!Number.isInteger(expiresAt) || expiresAt <= now) return null;
  if (!key.startsWith(PENDING_PREFIX)) return null;

  const expected = createHmac("sha256", uploadTokenSecret())
    .update(uploadSignatureInput(key, expiresAt))
    .digest("hex");
  const given = Buffer.from(signature, "utf8");
  const want = Buffer.from(expected, "utf8");
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return key;
}

/**
 * Issues a presigned PUT so the browser can upload the zip straight to the
 * bucket (the body never passes through the app server).
 *
 * The signature covers `content-length`, so the size the client declares is
 * enforced by the store itself: a request that sends a different number of
 * bytes does not match the signature and is rejected. That is why `size` is a
 * required argument — the 50 MB cap is a property of the signed write, not a
 * check the client could skip.
 */
export async function issueR2Upload(
  filename: string,
  size: number
): Promise<{ uploadUrl: string; fileUrl: string; key: string; uploadToken: string }> {
  const key = `${PENDING_PREFIX}${randomUUID()}-${sanitizeR2Key(filename)}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    ContentLength: size,
  });
  const uploadUrl = await getSignedUrl(s3Client(), command, { expiresIn: 15 * 60 });
  return {
    uploadUrl,
    fileUrl: r2PublicUrl(key),
    key,
    uploadToken: signUploadKey(key, Date.now() + UPLOAD_TOKEN_TTL_MS),
  };
}

/**
 * Moves a verified upload out of the pending prefix, which marks it as claimed
 * — the sweep only ever reclaims objects still under `pending/`, so a resource
 * a submission references can never be caught by it. Returns the public URL of
 * the claimed object, which is what the submission stores.
 */
export async function claimR2Upload(pendingKey: string): Promise<string> {
  const bucket = process.env.R2_BUCKET!;
  const claimedKey = `${CLAIMED_PREFIX}${pendingKey.slice(PENDING_PREFIX.length)}`;
  await s3Client().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${pendingKey}`,
      Key: claimedKey,
    })
  );
  await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: pendingKey }));
  return r2PublicUrl(claimedKey);
}

/**
 * Deletes one object by key. Deliberately takes a key rather than a URL: the
 * key must already have been proven to belong to the caller (see
 * `uploadKeyFromToken`), so no caller can name an arbitrary object to delete.
 */
export async function deleteR2ObjectByKey(key: string): Promise<void> {
  await s3Client().send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key })
  );
}

/** True when the sweep is due — lets callers avoid scheduling a no-op. */
export function uploadSweepDue(now: number = Date.now()): boolean {
  return now - lastSweepAt >= SWEEP_INTERVAL_MS;
}

/**
 * Reclaims uploads that were verified by nobody: an object still sitting under
 * the pending prefix past the retention window belongs to a client that never
 * came back, so it is deleted. Bounded (one page, throttled to once per hour
 * per process) and prefix-limited, so it can neither grow without bound nor
 * touch a claimed resource. Failures are the caller's to swallow — a sweep is
 * housekeeping and must never affect a request.
 */
export async function sweepUnclaimedUploads(now: number = Date.now()): Promise<void> {
  if (!uploadSweepDue(now)) return;
  lastSweepAt = now;
  const bucket = process.env.R2_BUCKET!;
  const listed = await s3Client().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: PENDING_PREFIX, MaxKeys: 100 })
  );
  for (const object of listed.Contents ?? []) {
    if (!object.Key || !object.LastModified) continue;
    if (now - object.LastModified.getTime() <= ORPHAN_TTL_MS) continue;
    await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key }));
  }
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