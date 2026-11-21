import { DEFAULT_TIMEZONE, type TenantLifecycleHooks } from "@money-matters/types";
import { tenants, tenantUsers, users, tenantUserPreferences, type DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";

interface DbMember {
  id: string;
  userId: string | null;
  role: string | null;
  inviteEmail: string | null;
  inviteStatus: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

function resolveLeaveWarning(myMember: DbMember | undefined, otherMembers: DbMember[], partnerMember: DbMember | undefined, tenantName: string) {
  if (myMember?.role !== "OWNER") {
    return { key: "privacy.leaveMemberWarning", params: { householdName: tenantName, email: partnerMember?.inviteEmail ?? partnerMember?.email ?? "the owner" } };
  }
  if (otherMembers.length <= 1) {
    const targetEmail = otherMembers[0]?.email || otherMembers[0]?.displayName || partnerMember?.inviteEmail || partnerMember?.email || "your partner";
    return { key: "privacy.leaveOwnerSingleMemberWarning", params: { email: targetEmail } };
  }
  const successor = otherMembers[0]?.email || otherMembers[0]?.displayName || "the next member";
  return { key: "privacy.leaveOwnerMultiMemberWarning", params: { successor, count: otherMembers.length } };
}

function resolveDeleteWarning(partnerMember: DbMember | undefined, otherMembersCount: number) {
  if (!partnerMember) return null;
  if (otherMembersCount > 1) return { key: "privacy.deleteMultiMemberWarning" };
  return { key: "privacy.deleteMemberWarning", params: { email: partnerMember.inviteEmail ?? partnerMember.email ?? "" } };
}

export async function getHouseholdGovernanceInfoHandler(tenantId: string, userId: string, db: DbOrTx) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const dbMembers = await db
    .select({
      id: tenantUsers.id,
      userId: tenantUsers.userId,
      role: tenantUsers.role,
      inviteEmail: tenantUsers.inviteEmail,
      inviteStatus: tenantUsers.inviteStatus,
      displayName: users.displayName,
      email: users.email,
      avatarUrl: users.avatarUrl,
    })
    .from(tenantUsers)
    .leftJoin(users, eq(tenantUsers.userId, users.id))
    .where(and(eq(tenantUsers.tenantId, tenantId), sql`${tenantUsers.archivedAt} IS NULL`));

  const myMember = dbMembers.find((m) => m.userId === userId);
  const partnerMember = dbMembers.find((m) => m.userId !== userId);
  const otherMembers = dbMembers.filter((m) => m.userId !== userId && m.role !== "OWNER");
  const acceptedOwners = dbMembers.filter((m) => m.role === "OWNER" && m.inviteStatus === "ACCEPTED");

  return {
    householdId: tenantId,
    currentUserId: userId,
    householdName: tenant?.name ?? "Household",
    userRole: myMember?.role ?? "MEMBER",
    isOwner: myMember?.role === "OWNER",
    isSoleOwner: myMember?.role === "OWNER" && acceptedOwners.length <= 1,
    ownerCount: acceptedOwners.length,
    memberCount: dbMembers.length,
    partnerEmail: partnerMember?.inviteEmail ?? partnerMember?.email ?? null,
    country: tenant?.country ?? "AU",
    currency: tenant?.currency ?? "AUD",
    timezone: tenant?.timezone ?? DEFAULT_TIMEZONE,
    state: tenant?.state ?? null,
    postcode: tenant?.postcode ?? null,
    membersList: dbMembers.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.displayName || m.email || m.inviteEmail || "Household Member",
      email: m.email || m.inviteEmail || "",
      avatarUrl: m.avatarUrl || null,
      role: m.role || "MEMBER",
      isOwner: m.role === "OWNER",
      inviteStatus: m.inviteStatus || "ACCEPTED",
      isPending: m.inviteStatus === "PENDING",
    })),
    leaveWarning: resolveLeaveWarning(myMember, otherMembers, partnerMember, tenant?.name ?? "Household"),
    deleteWarning: resolveDeleteWarning(partnerMember, otherMembers.length),
  };
}

export async function removeHouseholdMemberHandler(
  input: { targetUserId?: string; memberId?: string },
  tenantId: string,
  userId: string,
  db: DbOrTx,
  hooks?: TenantLifecycleHooks<DbOrTx>
) {
  const [caller] = await db
    .select()
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId), sql`${tenantUsers.archivedAt} IS NULL`));

  if (caller?.role !== "OWNER") throw new Error("Only the household owner can remove members.");
  if (input.targetUserId && input.targetUserId === userId) throw new Error("You cannot remove yourself using member removal.");

  const memberFilter = input.memberId ? eq(tenantUsers.id, input.memberId) : input.targetUserId ? eq(tenantUsers.userId, input.targetUserId) : null;
  if (!memberFilter) throw new Error("Target member ID or User ID is required.");

  const [targetMember] = await db.select().from(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), memberFilter));
  if (targetMember?.userId) {
    await hooks?.onMemberRemoved?.({
      db,
      tenantId,
      appId: "",
      userId,
      removedUserId: targetMember.userId,
    });
    await db.update(tenantUserPreferences).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.userId, targetMember.userId)));
  }

  await db.update(tenantUsers).set({ archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(tenantUsers.tenantId, tenantId), memberFilter));
  return { success: true };
}

export async function updateHouseholdHandler(
  input: { name: string; country?: string; currency?: string; timezone?: string; state?: string; postcode?: string },
  tenantId: string,
  userId: string,
  db: DbOrTx
) {
  const [myMember] = await db
    .select()
    .from(tenantUsers)
    .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId), sql`${tenantUsers.archivedAt} IS NULL`));

  if (myMember?.role !== "OWNER") throw new Error("Only the owner can update household settings");

  const [currentTenant] = await db.select({ currency: tenants.currency, country: tenants.country }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (input.currency && currentTenant && input.currency !== currentTenant.currency) {
    throw new Error("Household currency is permanently locked and cannot be changed.");
  }
  if (input.country && currentTenant && input.country !== currentTenant.country) {
    throw new Error("Household country is permanently locked and cannot be changed.");
  }

  await db
    .update(tenants)
    .set({
      name: input.name,
      country: currentTenant?.country ?? input.country ?? "AU",
      ...(input.timezone ? { timezone: input.timezone } : {}),
      state: input.state || null,
      postcode: input.postcode || null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));

  return { success: true };
}
