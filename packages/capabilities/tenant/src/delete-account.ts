import { t } from "@money-matters/i18n";
import {
  userPreferences,
  tenantUserPreferences,
  deviceTokens,
  tenantUsers,
  billingInvoices,
  aiUsage,
  earlyAccessSubscribers,
  tenants,
  users,
  type DbOrTx,
} from "@money-matters/db";
import type { TenantLifecycleHooks } from "@money-matters/types";
import { eq, and, sql, inArray, ne } from "drizzle-orm";
import { sendNotificationEmail, logger } from "@money-matters/core";
import Stripe from "stripe";

async function cancelStripeResources(
  tenantRecord: { stripeSubscriptionId: string | null; stripeCustomerId: string | null } | undefined
) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  if (tenantRecord?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(tenantRecord.stripeSubscriptionId);
    } catch (stripeErr) {
      logger.error("Failed to cancel Stripe subscription during account deletion:", { stripeErr });
      const isMissing =
        stripeErr instanceof Error &&
        (stripeErr.message.includes("No such subscription") || stripeErr.message.includes("resource_missing"));
      if (!isMissing) {
        throw new Error("Unable to cancel Stripe subscription. Account deletion aborted for billing safety.");
      }
    }
  }
}

async function purgeNeonAuthRecords(tx: DbOrTx, userId: string) {
  try {
    await tx.execute(sql`SAVEPOINT neon_auth_purge`);
    await tx.execute(sql`DELETE FROM neon_auth.session WHERE "userId" = ${userId}`);
    await tx.execute(sql`DELETE FROM neon_auth.user WHERE id = ${userId}`);
    await tx.execute(sql`RELEASE SAVEPOINT neon_auth_purge`);
  } catch (err) {
    await tx.execute(sql`ROLLBACK TO SAVEPOINT neon_auth_purge`).catch(() => {});
    logger.warn("Neon auth purge step skipped or failed:", { err });
  }
}

async function purgePlatformTenantRecords(
  tx: DbOrTx,
  tenantId: string,
  userId: string,
  email: string,
  appId: string,
  allUserIdsToPurgeTokens: string[],
  hooks?: TenantLifecycleHooks<DbOrTx>
): Promise<string[]> {
  if (allUserIdsToPurgeTokens.length > 0) {
    await tx
      .delete(deviceTokens)
      .where(
        and(
          inArray(deviceTokens.userId, allUserIdsToPurgeTokens),
          eq(deviceTokens.tenantId, tenantId),
          eq(deviceTokens.appId, appId)
        )
      );
  }

  const hookResult = await hooks?.onTenantDeleting?.({
    db: tx,
    tenantId,
    appId,
    userId,
    userEmail: email,
  });
  const fileKeysToDelete = hookResult?.fileKeysToDelete ?? [];

  await tx
    .delete(tenantUserPreferences)
    .where(
      and(
        eq(tenantUserPreferences.userId, userId),
        eq(tenantUserPreferences.tenantId, tenantId),
        eq(tenantUserPreferences.appId, appId)
      )
    );
  const legalHoldUntil = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000);
  await tx
    .update(billingInvoices)
    .set({ tenantId: null, legalHoldUntil, archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(billingInvoices.tenantId, tenantId), eq(billingInvoices.appId, appId)));
  await tx.delete(aiUsage).where(and(eq(aiUsage.tenantId, tenantId), eq(aiUsage.appId, appId)));
  if (email) {
    await tx
      .delete(earlyAccessSubscribers)
      .where(and(eq(earlyAccessSubscribers.email, email), eq(earlyAccessSubscribers.appId, appId)));
  }

  await tx.delete(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
  await tx.delete(tenants).where(and(eq(tenants.id, tenantId), eq(tenants.appId, appId)));

  // Only purge global identity records when 0 active tenants remain across all apps
  const remainingMemberships = await tx
    .select({ id: tenantUsers.id })
    .from(tenantUsers)
    .where(eq(tenantUsers.userId, userId))
    .limit(1);

  if (remainingMemberships.length === 0) {
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    await purgeNeonAuthRecords(tx, userId);
  }
  return fileKeysToDelete;
}

export function deleteMyAccountHandler(
  db: DbOrTx,
  deleteFileFromBucket?: (fileKey: string) => Promise<boolean>,
  hooks?: TenantLifecycleHooks<DbOrTx>
) {
  return async (tenantId: string, userId: string, email: string, appId: string) => {
    const partnerMemberships = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

    const partnerUserIds = partnerMemberships.map((p) => p.userId).filter((id): id is string => Boolean(id));
    const allUserIdsToPurgeTokens: string[] = [userId, ...partnerUserIds];

    const [tenantRecord] = await db
      .select({ stripeSubscriptionId: tenants.stripeSubscriptionId, stripeCustomerId: tenants.stripeCustomerId })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    await cancelStripeResources(tenantRecord);

    const fileKeysToDelete = await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
        .limit(1);

      if (membership && membership.role !== "OWNER") {
        throw new Error("Only the Household Owner can delete the household tenant. Partners can leave the household.");
      }

      return await purgePlatformTenantRecords(tx, tenantId, userId, email, appId, allUserIdsToPurgeTokens, hooks);
    });

    if (deleteFileFromBucket && fileKeysToDelete.length > 0) {
      await Promise.allSettled(fileKeysToDelete.map((fileKey) => deleteFileFromBucket(fileKey)));
    }

    await sendNotificationEmail(email, t("privacy.deletionConfirmedTitle"), t("privacy.deletionConfirmedBody"), appId);

    for (const partner of partnerMemberships) {
      let partnerEmail = partner.inviteEmail;
      if (!partnerEmail && partner.userId) {
        const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, partner.userId)).limit(1);
        partnerEmail = u?.email || null;
      }
      if (partnerEmail) {
        await sendNotificationEmail(
          partnerEmail,
          t("privacy.deletionNotificationSubject"),
          t("privacy.deletionNotificationBody", { ownerEmail: email }),
          appId
        ).catch((err) => logger.warn("Failed to send partner deletion notification email:", { err }));
      }
    }

    return { success: true };
  };
}

export function leaveTenantHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (tenantId: string, userId: string, email: string, appId: string) => {
    return await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
        .limit(1);

      if (!membership) throw new Error("You are not a member of this household.");

      const remainingMembers = await tx
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), ne(tenantUsers.userId, userId)));

      if (membership.role === "OWNER") {
        if (remainingMembers.length === 0) {
          throw new Error("You are the sole owner of this household. Please delete the household instead of leaving.");
        }
        const nextOwner = remainingMembers[0];
        await tx
          .update(tenantUsers)
          .set({ role: "OWNER", updatedAt: new Date(), updatedBy: userId })
          .where(eq(tenantUsers.id, nextOwner.id));

        if (nextOwner.inviteEmail) {
          await sendNotificationEmail(
            nextOwner.inviteEmail,
            "Household Ownership Transferred to You",
            `The former owner (${email}) has left the household. You are now the Household Owner.`,
            appId
          );
        }
      } else {
        const ownerMember = remainingMembers.find((m) => m.role === "OWNER");
        if (ownerMember?.inviteEmail) {
          await sendNotificationEmail(
            ownerMember.inviteEmail,
            "Household Member Left",
            `${email} has left your household budget.`,
            appId
          );
        }
      }

      await hooks?.onMemberLeft?.({ db: tx, tenantId, appId, userId, userEmail: email });

      await tx.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, tenantId), eq(tenantUserPreferences.userId, userId)));
      await tx.delete(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));

      const remainingTenantUsers = await tx
        .select({ id: tenantUsers.id })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId));

      return { success: true, hasOtherHousehold: remainingTenantUsers.length > 0 };
    });
  };
}
