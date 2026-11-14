export type LogLevel = "debug" | "info" | "warn" | "error";

const PII_KEYS = new Set([
  "email",
  "password",
  "token",
  "jwt",
  "authorization",
  "secret",
  "inviteemail",
  "invite_email",
  "displayname",
  "display_name",
  "avatarurl",
  "avatar_url",
  "note",
  "expopushtoken",
  "to",
  "recipient",
]);

function redactObjectEntries(record: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      redacted[key] = "[REDACTED_PII]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactPii(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/** Recursively redacts sensitive PII keys across errors, arrays, and plain objects. */
export function redactPii(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactPii(item));
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...redactObjectEntries(Object.fromEntries(Object.entries(obj))),
    };
  }
  return redactObjectEntries(obj as Record<string, unknown>);
}

/** Formats log line with ISO timestamp and PII-redacted JSON metadata. */
export function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  let safeMeta = "";
  if (meta !== undefined) {
    try {
      safeMeta = JSON.stringify(redactPii(meta));
    } catch {
      safeMeta = "[Unserializable metadata]";
    }
  }
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${safeMeta}`.trim();
}

export function createPiiSafeLogger(isDebugEnabled: () => boolean) {
  return {
    debug: (message: string, meta?: unknown) => {
      if (isDebugEnabled()) console.debug(formatLog("debug", message, meta));
    },
    info: (message: string, meta?: unknown) => console.info(formatLog("info", message, meta)),
    warn: (message: string, meta?: unknown) => console.warn(formatLog("warn", message, meta)),
    error: (message: string, meta?: unknown) => console.error(formatLog("error", message, meta)),
  };
}
