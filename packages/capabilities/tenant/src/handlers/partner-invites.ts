import { tenantUsers, tenants, users, type DbOrTx } from "@kaesava/db/rings/capabilities";
import { eq, and, sql, isNull } from "drizzle-orm";
import { ensurePremiumAccess } from "@kaesava/core";
import {
  GetInviteDetailsResult,
  InviteAccountStatus,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  type TenantLifecycleHooks,
} from "@kaesava/types";

function extractRows<T>(result: unknown): T[] {
  return Array.isArray(result)
    ? (result as T[])
    : ((result as { rows?: T[] }).rows ?? []);
}

async function resolveInviteAccountStatus(db: DbOrTx, email: string): Promise<InviteAccountStatus> {
  const normalized = email.trim().toLowerCase();
  try {
    const result = await db.execute<{ providerId: string }>(
      sql`SELECT a."providerId" as "providerId"
          FROM neon_auth.user u
          JOIN neon_auth.account a ON a."userId" = u.id
          WHERE lower(u.email) = ${normalized}`
    );
    const rows = extractRows<{ providerId: string }>(result);
    if (rows.length === 0) return "NEW";
    const providers = new Set(rows.map((r) => r.providerId));
    return providers.has("google") && !providers.has("credential") ? "GOOGLE_ONLY" : "CREDENTIAL";
  } catch {
    return "NEW";
  }
}

/**
 * Returns public metadata for an invite token, redacting email/household when a different user is signed in.
 */
export function getInviteDetailsHandler(db: DbOrTx) {
  return async (
    input: { inviteToken: string },
    activeUserEmail?: string
  ): Promise<GetInviteDetailsResult> => {
    const [row] = await db
      .select({
        inviteEmail: tenantUsers.inviteEmail,
        inviteStatus: tenantUsers.inviteStatus,
        expiresAt: tenantUsers.expiresAt,
        householdName: tenants.name,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(and(eq(tenantUsers.inviteToken, input.inviteToken), isNull(tenantUsers.archivedAt)))
      .limit(1);

    if (!row) return { status: "INVALID" };
    if (row.inviteStatus === "ACCEPTED") return { status: "ALREADY_ACCEPTED" };
    if (row.expiresAt && new Date() > new Date(row.expiresAt)) return { status: "EXPIRED" };

    const inviteEmail = row.inviteEmail?.trim().toLowerCase() ?? "";
    if (activeUserEmail && inviteEmail && activeUserEmail.trim().toLowerCase() !== inviteEmail) {
      return { status: "VALID", emailMismatch: true };
    }

    const accountStatus = inviteEmail ? await resolveInviteAccountStatus(db, inviteEmail) : "NEW";
    return {
      status: "VALID",
      emailMismatch: false,
      inviteEmail,
      householdName: row.householdName,
      accountStatus,
    };
  };
}

/**
 * Invites a partner to join the household tenant.
 */
export function invitePartnerHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (
    input: { email: string; role?: "MEMBER" | "VIEWER"; appRole?: string | null },
    tenantId: string,
    userId: string
  ) => {
    await ensurePremiumAccess(db, tenantId, "Household partner invitations");

    const role = input.role ?? ("MEMBER" as const);
    const appRole = input.appRole ?? null;

    if (hooks?.onBeforeMemberInvite) {
      const [tenant] = await db
        .select({ appId: tenants.appId })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      await hooks.onBeforeMemberInvite({
        db,
        tenantId,
        appId: tenant?.appId ?? "",
        userId,
        inviteeEmail: input.email,
        role,
        appRole,
      });
    }

    const inviteToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const [created] = await db
      .insert(tenantUsers)
      .values({
        tenantId,
        inviteEmail: input.email,
        inviteToken,
        inviteStatus: "PENDING" as const,
        role,
        appRole,
        expiresAt,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return {
      success: true,
      inviteToken: created.inviteToken,
      inviteEmail: created.inviteEmail,
      role: created.role,
      appRole: created.appRole,
      expiresAt: created.expiresAt,
    };
  };
}

/**
 * Accepts a household partner invitation after verifying token expiry and email identity.
 */
export function acceptInviteHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (input: { inviteToken: string }, userId: string, userEmail?: string) => {
    const [invite] = await db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.inviteToken, input.inviteToken),
          eq(tenantUsers.inviteStatus, "PENDING")
        )
      )
      .limit(1);

    if (!invite) {
      throw new Error("Invalid or expired invitation token.");
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      throw new Error("Invitation token has expired. Please request a new invitation from the household owner.");
    }

    if (invite.inviteEmail) {
      if (!userEmail || invite.inviteEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
        throw new Error(
          `Invitation email (${invite.inviteEmail}) does not match your active logged-in email (${userEmail || "unauthenticated"}). Please switch accounts or log out to accept this invitation.`
        );
      }
    }

    const [existingMember] = await db
      .select({ id: tenantUsers.id, role: tenantUsers.role })
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.tenantId, invite.tenantId),
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.inviteStatus, "ACCEPTED"),
          isNull(tenantUsers.archivedAt)
        )
      )
      .limit(1);

    if (existingMember) {
      await db
        .update(tenantUsers)
        .set({ archivedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
        .where(eq(tenantUsers.id, invite.id));
      return { success: true, tenantId: invite.tenantId, role: existingMember.role };
    }

    const [updated] = await db
      .update(tenantUsers)
      .set({
        userId,
        inviteStatus: "ACCEPTED" as const,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(tenantUsers.id, invite.id))
      .returning();

    const acceptedAt = new Date();
    await db
      .update(users)
      .set({
        termsAcceptedAt: acceptedAt,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        updatedAt: acceptedAt,
      })
      .where(eq(users.id, userId));

    const [tenant] = await db
      .select({ appId: tenants.appId })
      .from(tenants)
      .where(eq(tenants.id, updated.tenantId))
      .limit(1);

    if (!tenant) {
      throw new Error("Tenant not found for accepted invitation.");
    }

    await hooks?.onMemberJoined?.({
      db,
      tenantId: updated.tenantId,
      appId: tenant.appId,
      userId,
      userEmail,
    });

    await db.execute(sql`UPDATE neon_auth.user SET "emailVerified" = true, "updatedAt" = NOW() WHERE id = ${userId} AND ("emailVerified" = false OR "emailVerified" IS NULL)`);

    return {
      success: true,
      tenantId: updated.tenantId,
      role: updated.role,
    };
  };
}
