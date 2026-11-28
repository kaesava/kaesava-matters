import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  tmAccountingConnections,
  tmAccountingEntityLinks,
  tmInvoices,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { AccountingProvider, AccountingProviderPort } from "./port.js";
import { XeroAdapter } from "./xero-adapter.js";
import { MyobAdapter, QboAdapter } from "./myob-qbo-adapters.js";

export const AccountingProviderSchema = z.enum(["XERO", "MYOB", "QBO"]);

export const SaveAccountingConnectionInput = z
  .object({
    provider: AccountingProviderSchema,
    externalTenantId: z.string().min(1).max(255),
    externalTenantName: z.string().max(255).nullable().optional(),
    accessTokenEnc: z.string().min(1),
    refreshTokenEnc: z.string().nullable().optional(),
    tokenExpiresAt: z.string().datetime().nullable().optional(),
    syncCursor: z.string().max(255).nullable().optional(),
  })
  .strict();

export const UpsertEntityLinkInput = z
  .object({
    provider: AccountingProviderSchema,
    entityType: z.enum(["CUSTOMER", "INVOICE", "CREDIT_NOTE", "SUPPLIER_BILL", "TIMESHEET"]),
    localId: z.string().uuid(),
    externalId: z.string().min(1).max(255),
    syncStatus: z.enum(["SYNCED", "PENDING", "ERROR"]).optional(),
    lastSyncHash: z.string().max(128).nullable().optional(),
    lastError: z.string().nullable().optional(),
  })
  .strict();

export interface IntegrationsContext {
  tenantId: string;
  appId: string;
  userId: string;
}

export async function listAccountingConnectionsQuery(db: DbOrTx, ctx: IntegrationsContext) {
  return db
    .select()
    .from(tmAccountingConnections)
    .where(
      and(
        eq(tmAccountingConnections.tenantId, ctx.tenantId),
        eq(tmAccountingConnections.appId, ctx.appId),
        isNull(tmAccountingConnections.archivedAt)
      )
    );
}

export async function saveAccountingConnectionCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof SaveAccountingConnectionInput>
) {
  const now = new Date();
  const [row] = await db
    .insert(tmAccountingConnections)
    .values({
      id: crypto.randomUUID(),
      provider: input.provider,
      externalTenantId: input.externalTenantId,
      externalTenantName: input.externalTenantName ?? null,
      accessTokenEnc: input.accessTokenEnc,
      refreshTokenEnc: input.refreshTokenEnc ?? null,
      tokenExpiresAt: input.tokenExpiresAt ? new Date(input.tokenExpiresAt) : null,
      lastSyncedAt: now,
      syncCursor: input.syncCursor ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return row;
}

export async function upsertAccountingEntityLinkCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof UpsertEntityLinkInput>
) {
  const now = new Date();
  const existing = await db
    .select()
    .from(tmAccountingEntityLinks)
    .where(
      and(
        eq(tmAccountingEntityLinks.tenantId, ctx.tenantId),
        eq(tmAccountingEntityLinks.appId, ctx.appId),
        eq(tmAccountingEntityLinks.provider, input.provider),
        eq(tmAccountingEntityLinks.entityType, input.entityType),
        eq(tmAccountingEntityLinks.localId, input.localId),
        isNull(tmAccountingEntityLinks.archivedAt)
      )
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(tmAccountingEntityLinks)
      .set({
        externalId: input.externalId,
        syncStatus: input.syncStatus ?? "SYNCED",
        lastSyncHash: input.lastSyncHash ?? null,
        lastError: input.lastError ?? null,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(eq(tmAccountingEntityLinks.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(tmAccountingEntityLinks)
    .values({
      id: crypto.randomUUID(),
      provider: input.provider,
      entityType: input.entityType,
      localId: input.localId,
      externalId: input.externalId,
      syncStatus: input.syncStatus ?? "SYNCED",
      lastSyncHash: input.lastSyncHash ?? null,
      lastError: input.lastError ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return created;
}

export async function handleAccountingPaymentWebhookCommand(
  db: DbOrTx,
  provider: AccountingProvider,
  externalInvoiceId: string
): Promise<{ pausedChasing: boolean }> {
  const [link] = await db
    .select()
    .from(tmAccountingEntityLinks)
    .where(
      and(
        eq(tmAccountingEntityLinks.provider, provider),
        eq(tmAccountingEntityLinks.entityType, "INVOICE"),
        eq(tmAccountingEntityLinks.externalId, externalInvoiceId),
        isNull(tmAccountingEntityLinks.archivedAt)
      )
    )
    .limit(1);

  if (!link) return { pausedChasing: false };

  await db
    .update(tmInvoices)
    .set({ chasingEnabled: false, status: "PAID", updatedAt: new Date() })
    .where(eq(tmInvoices.id, link.localId));
  return { pausedChasing: true };
}

export interface AccountingOAuthEnv {
  XERO_CLIENT_ID?: string;
  XERO_CLIENT_SECRET?: string;
  MYOB_CLIENT_ID?: string;
  MYOB_CLIENT_SECRET?: string;
  QBO_CLIENT_ID?: string;
  QBO_CLIENT_SECRET?: string;
  fetcher?: typeof fetch;
}

export function createAccountingAdapter(provider: AccountingProvider, env: AccountingOAuthEnv): AccountingProviderPort {
  if (provider === "XERO") {
    return new XeroAdapter({ clientId: env.XERO_CLIENT_ID ?? "", clientSecret: env.XERO_CLIENT_SECRET ?? "", fetcher: env.fetcher });
  }
  if (provider === "MYOB") {
    return new MyobAdapter({ clientId: env.MYOB_CLIENT_ID ?? "", clientSecret: env.MYOB_CLIENT_SECRET ?? "", fetcher: env.fetcher });
  }
  return new QboAdapter({ clientId: env.QBO_CLIENT_ID ?? "", clientSecret: env.QBO_CLIENT_SECRET ?? "", fetcher: env.fetcher });
}

export const StartAccountingOAuthInput = z
  .object({
    provider: AccountingProviderSchema,
    redirectUri: z.string().url(),
  })
  .strict();

export function startAccountingOAuthCommand(
  env: AccountingOAuthEnv,
  input: z.infer<typeof StartAccountingOAuthInput>
): { authorizeUrl: string; state: string; codeVerifier: string } {
  const state = crypto.randomUUID();
  const codeVerifier = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const adapter = createAccountingAdapter(input.provider, env);
  const authorizeUrl = adapter.getAuthorizeUrl(state, input.redirectUri);
  return { authorizeUrl, state, codeVerifier };
}

export async function disconnectAccountingCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  provider: AccountingProvider
): Promise<{ disconnected: boolean }> {
  const now = new Date();
  const updated = await db
    .update(tmAccountingConnections)
    .set({ archivedAt: now, updatedAt: now, updatedBy: ctx.userId })
    .where(
      and(
        eq(tmAccountingConnections.tenantId, ctx.tenantId),
        eq(tmAccountingConnections.appId, ctx.appId),
        eq(tmAccountingConnections.provider, provider),
        isNull(tmAccountingConnections.archivedAt)
      )
    )
    .returning({ id: tmAccountingConnections.id });
  return { disconnected: updated.length > 0 };
}

export async function syncAccountingNowCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  env: AccountingOAuthEnv,
  provider: AccountingProvider
): Promise<{ syncedPayments: number; pausedInvoices: number }> {
  const [conn] = await db
    .select()
    .from(tmAccountingConnections)
    .where(
      and(
        eq(tmAccountingConnections.tenantId, ctx.tenantId),
        eq(tmAccountingConnections.appId, ctx.appId),
        eq(tmAccountingConnections.provider, provider),
        isNull(tmAccountingConnections.archivedAt)
      )
    )
    .limit(1);

  if (!conn) {
    throw new Error(`No active ${provider} connection found.`);
  }

  const adapter = createAccountingAdapter(provider, env);
  let accessToken = conn.accessTokenEnc;
  if (conn.tokenExpiresAt && conn.tokenExpiresAt.getTime() <= Date.now() && conn.refreshTokenEnc) {
    const refreshed = await adapter.refreshTokens(conn.refreshTokenEnc);
    accessToken = refreshed.accessToken;
    await db
      .update(tmAccountingConnections)
      .set({
        accessTokenEnc: refreshed.accessToken,
        refreshTokenEnc: refreshed.refreshToken ?? conn.refreshTokenEnc,
        tokenExpiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(eq(tmAccountingConnections.id, conn.id));
  }

  const { payments, nextCursor } = await adapter.fetchInboundPayments(accessToken, conn.externalTenantId, conn.syncCursor);
  let pausedInvoices = 0;
  for (const payment of payments) {
    if (!payment.invoiceExternalId) continue;
    const res = await handleAccountingPaymentWebhookCommand(db, provider, payment.invoiceExternalId);
    if (res.pausedChasing) pausedInvoices += 1;
  }

  const now = new Date();
  await db
    .update(tmAccountingConnections)
    .set({
      lastSyncedAt: now,
      syncCursor: nextCursor ?? conn.syncCursor,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmAccountingConnections.id, conn.id));

  return { syncedPayments: payments.length, pausedInvoices };
}
