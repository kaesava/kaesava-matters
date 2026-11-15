import { DbOrTx } from "@money-matters/db";
import { CheckEmailAuthProviderResult } from "@money-matters/types";
import { sql } from "drizzle-orm";

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
      const rows = Array.isArray(result)
        ? result
        : ((result as { rows?: { providerId: string }[] }).rows ?? []);

      if (rows.length === 0) {
        return { isGoogleOnly: false };
      }

      const providers = new Set(rows.map((r) => r.providerId));
      return {
        isGoogleOnly: providers.has("google") && !providers.has("credential"),
      };
    } catch {
      return { isGoogleOnly: false };
    }
  };
}
