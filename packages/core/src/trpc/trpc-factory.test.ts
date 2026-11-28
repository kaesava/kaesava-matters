import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { DbClient, DbOrTx } from "@kaesava/db/rings/platform";
import type { SubscriptionStatusDto } from "@kaesava/types";
import {
  createPlatformTrpc,
  type PlatformTrpcContext,
  type PlatformTrpcDependencies,
  type WriteAccessDecision,
} from "./trpc-factory.js";

function makeSubscriptionStatus(
  overrides: Partial<SubscriptionStatusDto> = {}
): SubscriptionStatusDto {
  return {
    status: "TRIAL_ACTIVE",
    isTrialActive: true,
    isTrialExpired: false,
    isSubscribed: false,
    isGracePeriod: false,
    isPastDue: false,
    isDeactivated: false,
    daysRemainingInTrial: 14,
    trialEndsAt: new Date(Date.now() + 86400 * 1000 * 14),
    subscriptionEndsAt: null,
    cancelAtPeriodEnd: false,
    planType: null,
    nextBillingAt: null,
    ...overrides,
  };
}

function makeMockDb(executedSqls: unknown[] = []): DbClient {
  const txMock = {
    execute: vi.fn(async (query: unknown) => {
      executedSqls.push(query);
      return [];
    }),
  } as unknown as DbOrTx;

  const dbMock = {
    transaction: vi.fn(async (cb: (tx: DbOrTx) => Promise<unknown>) => cb(txMock)),
  };

  return dbMock as unknown as DbClient;
}

function makeContext(overrides: Partial<PlatformTrpcContext> = {}): PlatformTrpcContext {
  return {
    db: makeMockDb(),
    session: {
      userId: "user-1",
      email: "owner@kaesava.au",
      tenantId: "tenant-1",
      appId: "app-1",
      role: "OWNER",
    },
    userId: "user-1",
    tenantId: "tenant-1",
    appId: "app-1",
    email: "owner@kaesava.au",
    correlationId: "corr-1",
    ...overrides,
  };
}

function buildTestTrpc(
  statusOverrides: Partial<SubscriptionStatusDto> = {},
  writeDecision: WriteAccessDecision = { allowed: true }
) {
  const getSubscriptionStatus = vi.fn(async () => makeSubscriptionStatus(statusOverrides));
  const evaluateSubscriptionWriteAccess = vi.fn(() => writeDecision);
  const deps: PlatformTrpcDependencies = {
    getSubscriptionStatus,
    evaluateSubscriptionWriteAccess,
  };
  const trpc = createPlatformTrpc(deps);
  const appRouter = trpc.router({
    pub: trpc.publicProcedure.query(() => "ok"),
    auth: trpc.authenticatedProcedure.query(({ ctx }) => ctx.userId),
    tenant: trpc.tenantProcedure.query(({ ctx }) => ({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    })),
    privTenant: trpc.privateTenantProcedure.query(({ ctx }) => ctx.tenantId),
    owner: trpc.ownerProcedure.query(() => "owner-ok"),
    privOwner: trpc.privateOwnerProcedure.query(() => "priv-owner-ok"),
    memberWrite: trpc.memberWriteProcedure.query(() => "member-ok"),
    privMemberWrite: trpc.privateMemberWriteProcedure.query(() => "priv-member-ok"),
    premium: trpc.premiumProcedure.query(() => "premium-ok"),
    dbError: trpc.publicProcedure.query(() => {
      throw new Error('duplicate key value violates unique constraint "users_email_idx"');
    }),
    badRequest: trpc.publicProcedure.query(() => {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid input payload" });
    }),
  });
  return { trpc, appRouter, getSubscriptionStatus, evaluateSubscriptionWriteAccess };
}

describe("createPlatformTrpc", () => {
  it("allows publicProcedure without a session", async () => {
    const { appRouter } = buildTestTrpc();
    const caller = appRouter.createCaller(makeContext({ session: null, userId: null }));
    await expect(caller.pub()).resolves.toBe("ok");
  });

  it("enforces authenticatedProcedure session check", async () => {
    const { appRouter } = buildTestTrpc();
    const unauthCaller = appRouter.createCaller(makeContext({ session: null, userId: null }));
    await expect(unauthCaller.auth()).rejects.toThrow("Authentication required.");

    const authCaller = appRouter.createCaller(makeContext());
    await expect(authCaller.auth()).resolves.toBe("user-1");
  });

  it("sets tenant RLS only for tenantProcedure and both tenant + user RLS for privateTenantProcedure", async () => {
    const { appRouter, getSubscriptionStatus } = buildTestTrpc();

    const tenantSqls: unknown[] = [];
    const tenantCaller = appRouter.createCaller(makeContext({ db: makeMockDb(tenantSqls) }));
    await expect(tenantCaller.tenant()).resolves.toEqual({ tenantId: "tenant-1", userId: "user-1" });
    expect(tenantSqls).toHaveLength(1);
    expect(getSubscriptionStatus).toHaveBeenCalledTimes(1);

    const privSqls: unknown[] = [];
    const privCaller = appRouter.createCaller(makeContext({ db: makeMockDb(privSqls) }));
    await expect(privCaller.privTenant()).resolves.toBe("tenant-1");
    expect(privSqls).toHaveLength(2);
  });

  it("rejects tenantProcedure when tenant context is missing or subscription is deactivated", async () => {
    const { appRouter } = buildTestTrpc();
    const missingCtxCaller = appRouter.createCaller(makeContext({ tenantId: null }));
    await expect(missingCtxCaller.tenant()).rejects.toThrow(/Multi-tenancy boundary isolation/);

    const { appRouter: deactivatedRouter } = buildTestTrpc({ isDeactivated: true });
    const deactivatedCaller = deactivatedRouter.createCaller(makeContext());
    await expect(deactivatedCaller.tenant()).rejects.toThrow(/subscription_deactivated/);
  });

  it("enforces OWNER and MEMBER write RBAC across ownerProcedure and memberWriteProcedure", async () => {
    const { appRouter } = buildTestTrpc();

    const viewerCaller = appRouter.createCaller(
      makeContext({
        session: {
          userId: "u2",
          email: "v@kaesava.au",
          tenantId: "tenant-1",
          appId: "app-1",
          role: "VIEWER",
        },
      })
    );
    await expect(viewerCaller.owner()).rejects.toThrow(/household owner/);
    await expect(viewerCaller.privOwner()).rejects.toThrow(/household owner/);
    await expect(viewerCaller.memberWrite()).rejects.toThrow(/Viewer members have read-only/);
    await expect(viewerCaller.privMemberWrite()).rejects.toThrow(/Viewer members have read-only/);

    const memberCaller = appRouter.createCaller(
      makeContext({
        session: {
          userId: "u3",
          email: "m@kaesava.au",
          tenantId: "tenant-1",
          appId: "app-1",
          role: "MEMBER",
        },
      })
    );
    await expect(memberCaller.owner()).rejects.toThrow(/household owner/);
    await expect(memberCaller.memberWrite()).resolves.toBe("member-ok");
    await expect(memberCaller.privMemberWrite()).resolves.toBe("priv-member-ok");

    const ownerCaller = appRouter.createCaller(makeContext());
    await expect(ownerCaller.owner()).resolves.toBe("owner-ok");
    await expect(ownerCaller.privOwner()).resolves.toBe("priv-owner-ok");
  });

  it("blocks premiumProcedure when trial is expired and allows active trial", async () => {
    const { appRouter: expiredRouter } = buildTestTrpc({ isTrialExpired: true, isTrialActive: false });
    await expect(expiredRouter.createCaller(makeContext()).premium()).rejects.toThrow(
      /subscription_premium_required/
    );

    const { appRouter: activeRouter } = buildTestTrpc({ isTrialExpired: false, isTrialActive: true });
    await expect(activeRouter.createCaller(makeContext()).premium()).resolves.toBe("premium-ok");
  });

  it("evaluates requiresWriteAccess for allowed, read-only subscription, and custom denial", () => {
    const { trpc: allowedTrpc } = buildTestTrpc({}, { allowed: true });
    expect(() =>
      allowedTrpc.requiresWriteAccess({
        subscriptionStatus: makeSubscriptionStatus(),
        session: { role: "OWNER" },
      })
    ).not.toThrow();

    const { trpc: readOnlyTrpc } = buildTestTrpc(
      {},
      { allowed: false, reason: "READ_ONLY_SUBSCRIPTION" }
    );
    expect(() =>
      readOnlyTrpc.requiresWriteAccess({
        subscriptionStatus: makeSubscriptionStatus({ isTrialExpired: true }),
        session: { role: "OWNER" },
      })
    ).toThrow(/currently read-only/);

    const { trpc: customDeniedTrpc } = buildTestTrpc(
      {},
      { allowed: false, message: "Custom write restriction" }
    );
    expect(() =>
      customDeniedTrpc.requiresWriteAccess({
        subscriptionStatus: makeSubscriptionStatus(),
        session: { role: "VIEWER" },
      })
    ).toThrow("Custom write restriction");
  });

  it("sanitizes internal DB error messages while preserving explicit BAD_REQUEST errors", async () => {
    const { appRouter } = buildTestTrpc();
    const callHttp = async (proc: string) => {
      const res = await fetchRequestHandler({
        endpoint: "/trpc",
        req: new Request(`http://localhost/trpc/${proc}`),
        router: appRouter,
        createContext: () => makeContext(),
      });
      return (await res.json()) as { error?: { message?: string } };
    };

    const dbErrJson = await callHttp("dbError");
    expect(dbErrJson.error?.message).toBe(
      "Something went wrong while processing your request. Please try again."
    );

    const badReqJson = await callHttp("badRequest");
    expect(badReqJson.error?.message).toBe("Invalid input payload");
  });
});
