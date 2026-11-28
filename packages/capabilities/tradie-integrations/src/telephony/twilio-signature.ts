/**
 * Verifies X-Twilio-Signature using Web Crypto HMAC-SHA1.
 */
export async function verifyTwilioSignature(
  authToken: string,
  webhookUrl: string,
  params: Record<string, string>,
  expectedSignature: string
): Promise<boolean> {
  if (!authToken || !expectedSignature) return false;
  const sortedKeys = Object.keys(params).sort();
  let payload = webhookUrl;
  for (const key of sortedKeys) {
    payload += `${key}${params[key] ?? ""}`;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(sigBuf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const computed = btoa(binary);
  return computed === expectedSignature;
}
