import { API_BASE_URL, getActiveTenantId, getStoredTokenAndCookie } from "../../lib/trpc";

interface PresignResult {
  uploadUrl: string;
  fileKey: string;
}

export async function uploadReceiptToR2(
  jobId: string,
  uri: string,
  mimeType: string,
  presign: (input: {
    entityType: "ENVELOPE";
    entityId: string;
    fileName: string;
    fileMimeType: string;
    fileSize: number;
  }) => Promise<PresignResult>,
  createFileNote: (input: {
    entityType: "ENVELOPE";
    entityId: string;
    attachment: { fileKey: string; fileName: string; fileMimeType: string; fileSize: number };
  }) => Promise<{ id: string }>
): Promise<string> {
  const fileName = `receipt-${jobId.slice(0, 8)}-${Date.now()}.jpg`;
  const presigned = await presign({ entityType: "ENVELOPE", entityId: jobId, fileName, fileMimeType: mimeType, fileSize: 1024 });
  const uploadUrl = presigned.uploadUrl.startsWith("/") ? `${API_BASE_URL}${presigned.uploadUrl}` : presigned.uploadUrl;
  const blob = await (await fetch(uri)).blob();
  const { token, cookie } = await getStoredTokenAndCookie();
  const tenantId = getActiveTenantId();
  const headers: Record<string, string> = { "Content-Type": mimeType };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (cookie) headers["Cookie"] = cookie;
  if (tenantId) headers["x-tenant-id"] = tenantId;
  const res = await fetch(uploadUrl, { method: "PUT", headers, body: blob });
  if (!res.ok) {
    throw new Error(`Receipt upload failed (${res.status})`);
  }
  const created = await createFileNote({
    entityType: "ENVELOPE",
    entityId: jobId,
    attachment: { fileKey: presigned.fileKey, fileName, fileMimeType: mimeType, fileSize: blob.size || 1024 },
  });
  return created.id;
}