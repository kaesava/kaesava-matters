import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { CapabilityError } from "./errors.js";
import { logger } from "./logger.js";

function isProductionStorage(): boolean {
  return process.env.NODE_ENV === "production" || process.env.ENVIRONMENT === "production";
}

function hasR2Credentials(): boolean {
  return Boolean(
    process.env.STORAGE_BUCKET_NAME &&
      process.env.STORAGE_ACCESS_KEY_ID &&
      process.env.STORAGE_SECRET_ACCESS_KEY
  );
}

// Dev-only in-memory store when R2 credentials are not configured locally
const devMemoryStore = new Map<string, { body: Uint8Array; contentType: string }>();

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || "",
      },
      region: process.env.STORAGE_REGION || "auto",
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return _s3Client;
}

export const s3Client = new Proxy({} as S3Client, {
  get: (_target, prop) => Reflect.get(getS3Client(), prop),
});

export async function getPresignedUploadUrl(fileKey: string, _contentType: string): Promise<string> {
  if (!hasR2Credentials() && isProductionStorage()) {
    throw new CapabilityError("INTERNAL_SERVER_ERROR", "storage_not_configured");
  }
  return `/api/file-notes/upload?key=${encodeURIComponent(fileKey)}`;
}

export async function getPresignedDownloadUrl(noteIdOrKey: string): Promise<string> {
  if (!hasR2Credentials() && isProductionStorage()) {
    throw new CapabilityError("INTERNAL_SERVER_ERROR", "storage_not_configured");
  }
  return `/api/file-notes/download/${encodeURIComponent(noteIdOrKey)}`;
}

export async function uploadObjectToStorage(
  fileKey: string,
  body: Uint8Array,
  contentType: string
): Promise<void> {
  if (!hasR2Credentials()) {
    if (isProductionStorage()) {
      throw new CapabilityError("INTERNAL_SERVER_ERROR", "storage_not_configured");
    }
    devMemoryStore.set(fileKey, { body, contentType });
    logger.info(`[Storage Dev] Stored file in memory: ${fileKey} (${body.byteLength} bytes)`);
    return;
  }

  const command = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME!,
    Key: fileKey,
    Body: body,
    ContentType: contentType,
  });
  await getS3Client().send(command);
}

export async function downloadObjectFromStorage(
  fileKey: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  if (!hasR2Credentials()) {
    if (isProductionStorage()) {
      throw new CapabilityError("INTERNAL_SERVER_ERROR", "storage_not_configured");
    }
    return devMemoryStore.get(fileKey) ?? null;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME!,
    Key: fileKey,
  });
  const response = await getS3Client().send(command);
  if (!response.Body) return null;
  const bytes = await response.Body.transformToByteArray();
  return {
    body: bytes,
    contentType: response.ContentType || "application/octet-stream",
  };
}

export async function deleteFileFromBucket(fileKey: string): Promise<boolean> {
  if (!hasR2Credentials()) {
    devMemoryStore.delete(fileKey);
    logger.info(`[Storage Dev] Deleted file from memory: ${fileKey}`);
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.STORAGE_BUCKET_NAME!,
      Key: fileKey,
    });
    await getS3Client().send(command);
    return true;
  } catch (error) {
    logger.error(`[Storage] Failed to delete file with key: ${fileKey}`, { error });
    return false;
  }
}
