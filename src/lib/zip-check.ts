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

// Reads only the first chunk of the uploaded blob and checks for a ZIP magic
// signature, so content is validated server-side without downloading the whole
// file (bounded even if the store ignores the Range header).
export async function looksLikeZip(url: string): Promise<boolean> {
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