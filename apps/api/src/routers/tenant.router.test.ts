import type { createEdgeContext } from "../trpc/edge-context";
import { describe, it, expect } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { appRouter } from "./_app.js";

function createMockDb(): DbOrTx {
  const chain: Record<string, unknown> = {
    from: () => chain,
    where: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    orderBy: () => chain,
    limit: () => Promise.resolve([]),
    groupBy: () => Promise.resolve([]),
    then: (resolve: (v: unknown[]) => void) => resolve([]),
  };
  return {
    select: () => chain,
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]), onConflictDoNothing: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
  } as unknown as DbOrTx;
}

describe("tenant router", () => {
  it("rejects unauthenticated callers with UNAUTHORIZED", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: createMockDb() as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: null,
      session: null,
      email: null,
      tenantId: null,
      appId: null,
      correlationId: "corr-1",
    });

    await expect(caller.getTenantStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("checkEmailAuthProvider returns isGoogleOnly=true for Google-only accounts", async () => {
    const dbWithExecute = {
      ...createMockDb(),
      execute: async () => [{ providerId: "google" }],
    };
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: dbWithExecute as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: null,
      session: null,
      email: null,
      tenantId: null,
      appId: null,
      correlationId: "corr-2",
    });

    await expect(caller.checkEmailAuthProvider({ email: "g@example.com" })).resolves.toEqual({
      isGoogleOnly: true,
    });
  });

  it("getAuthMethods returns active login methods for authenticated user", async () => {
    const dbWithExecute = {
      ...createMockDb(),
      execute: async () => [
        { providerId: "google", accountId: "google-123", password: null },
        { providerId: "credential", accountId: "user-1", password: "salt:hash" },
      ],
    };
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: dbWithExecute as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: "user-1",
      session: {
        userId: "user-1",
        email: "user@example.com",
        displayName: "Test User",
        tenantId: null,
        appId: "00000000-0000-0000-0000-000000000000",
        role: null,
      },
      email: "user@example.com",
      tenantId: null,
      appId: "00000000-0000-0000-0000-000000000000",
      correlationId: "corr-3",
    });

    await expect(caller.getAuthMethods()).resolves.toEqual({
      hasPassword: true,
      hasGoogle: true,
      googleAccountId: "google-123",
    });
  });

  it("setAccountPassword throws CONFLICT when password is already set", async () => {
    const dbWithExecute = {
      ...createMockDb(),
      execute: async () => [{ id: "acc-1", password: "existing:hash" }],
    };
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: dbWithExecute as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: "user-1",
      session: {
        userId: "user-1",
        email: "user@example.com",
        displayName: "Test User",
        tenantId: null,
        appId: "00000000-0000-0000-0000-000000000000",
        role: null,
      },
      email: "user@example.com",
      tenantId: null,
      appId: "00000000-0000-0000-0000-000000000000",
      correlationId: "corr-4",
    });

    await expect(caller.setAccountPassword({ newPassword: "NewPassword123!" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("getInviteDetails returns INVALID when token is not found", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/trpc"),
      resHeaders: new Headers(),
      db: createMockDb() as unknown as Awaited<ReturnType<typeof createEdgeContext>>["db"],
      userId: null,
      session: null,
      email: null,
      tenantId: null,
      appId: null,
      correlationId: "corr-5",
    });

    await expect(caller.getInviteDetails({ inviteToken: "missing-token" })).resolves.toEqual({
      status: "INVALID",
    });
  });
});
