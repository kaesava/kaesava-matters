import { DbOrTx } from "@money-matters/db";
import { AccountAuthMethods, CheckEmailAuthProviderResult } from "@money-matters/types";
import { sql } from "drizzle-orm";

function extractRows<T>(result: unknown): T[] {
  return Array.isArray(result)
    ? (result as T[])
    : ((result as { rows?: T[] }).rows ?? []);
}

/**
 * Checks whether an email address belongs to a Google-only Neon Auth account
 * (has a `google` provider account and no `credential` password account).
 * Returns `{ isGoogleOnly: false }` for unknown or credential-enabled accounts.
 */
export function checkEmailAuthProviderHandler(db: DbOrTx) {
  return async (email: string): Promise<CheckEmailAuthProviderResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const result = await db.execute<{ providerId: string }>(
        sql`SELECT a."providerId" as "providerId"
            FROM neon_auth.user u
            JOIN neon_auth.account a ON a."userId" = u.id
            WHERE lower(u.email) = ${normalizedEmail}`
      );
      const rows = extractRows<{ providerId: string }>(result);
      if (rows.length === 0) return { isGoogleOnly: false };

      const providers = new Set(rows.map((r) => r.providerId));
      return {
        isGoogleOnly: providers.has("google") && !providers.has("credential"),
      };
    } catch {
      return { isGoogleOnly: false };
    }
  };
}

/**
 * Lists the active authentication methods (password and Google OAuth) for an authenticated user.
 */
export function getAuthMethodsHandler(db: DbOrTx) {
  return async (userId: string): Promise<AccountAuthMethods> => {
    const result = await db.execute<{ providerId: string; accountId: string | null; password: string | null }>(
      sql`SELECT "providerId", "accountId", password
          FROM neon_auth.account
          WHERE "userId" = ${userId}`
    );
    const rows = extractRows<{ providerId: string; accountId: string | null; password: string | null }>(result);
    const googleRow = rows.find((r) => r.providerId === "google");
    return {
      hasPassword: rows.some((r) => r.providerId === "credential" && Boolean(r.password)),
      hasGoogle: Boolean(googleRow),
      googleAccountId: googleRow?.accountId ?? null,
    };
  };
}

/**
 * Sets an initial credential password for an authenticated user who signed up via OAuth.
 * Rejects if a credential password is already configured (use Better Auth changePassword instead).
 */
export function setAccountPasswordHandler(
  db: DbOrTx,
  hashPasswordFn: (password: string) => Promise<string>
) {
  return async (userId: string, newPassword: string): Promise<{ success: true }> => {
    const existingRes = await db.execute<{ id: string; password: string | null }>(
      sql`SELECT id, password
          FROM neon_auth.account
          WHERE "userId" = ${userId} AND "providerId" = 'credential'
          LIMIT 1`
    );
    const existing = extractRows<{ id: string; password: string | null }>(existingRes)[0];
    if (existing?.password) {
      throw new Error("PASSWORD_ALREADY_SET");
    }

    const passwordHash = await hashPasswordFn(newPassword);
    if (existing) {
      await db.execute(
        sql`UPDATE neon_auth.account
            SET password = ${passwordHash}, "updatedAt" = NOW()
            WHERE id = ${existing.id}`
      );
      return { success: true };
    }

    await db.execute(
      sql`INSERT INTO neon_auth.account (id, "userId", "accountId", "providerId", password, "createdAt", "updatedAt")
          VALUES (${crypto.randomUUID()}, ${userId}, ${userId}, 'credential', ${passwordHash}, NOW(), NOW())`
    );
    return { success: true };
  };
}
