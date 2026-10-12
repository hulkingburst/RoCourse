// A real ZIP archive starts with "PK\x03\x04" (local file header),
// "PK\x05\x06" (empty archive) or "PK\x07\x08" (spanned archive).
export function isZipMagic(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const [p, k, signature] = bytes;
  return (
    p === 0x50 &&
    k === 0x4b &&
    (signature === 0x03 || signature === 0x05 || signature === 0x07)
  );
}

/**
 * What a server-side sniff concluded about an uploaded object. The three-way
 * result matters: "not-zip" is a positive finding about an object the server
 * actually read, while "unreadable" means it learned nothing at all. Only the
 * former may ever be treated as an invalid upload — a network failure must not
 * look like a bad file.
 */
export type ZipSniff = "zip" | "not-zip" | "unreadable";

// Reads only the first chunk of the uploaded blob and checks for a ZIP magic
// signature, so content is validated server-side without downloading the whole
// file (bounded even if the store ignores the Range header).
export async function sniffZip(url: string): Promise<ZipSniff> {
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-3" },
      cache: "no-store",
    });
    if (!response.ok || !response.body) return "unreadable";
    const reader = response.body.getReader();
    const { value } = await reader.read();
    reader.cancel().catch(() => {});
    if (!value) return "unreadable";
    return isZipMagic(value) ? "zip" : "not-zip";
  } catch {
    return "unreadable";
  }
}

/** Convenience wrapper: true only for a positively identified ZIP. */
export async function looksLikeZip(url: string): Promise<boolean> {
  return (await sniffZip(url)) === "zip";
}