function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Hashes a raw customer portal token using Web Crypto SHA-256.
 */
export async function hashPortalToken(rawToken: string): Promise<string> {
  const data = new TextEncoder().encode(rawToken);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/**
 * Generates a high-entropy raw portal token and its SHA-256 hash for storage.
 */
export async function generatePortalToken(): Promise<{ rawToken: string; tokenHash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const rawToken = toBase64Url(bytes);
  const tokenHash = await hashPortalToken(rawToken);
  return { rawToken, tokenHash };
}
