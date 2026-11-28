import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/capabilities";
import {
  createRoomCommand,
  getUnreadCountsQuery,
  listRoomMessagesQuery,
  markRoomReadCommand,
  parseMentionedUserIds,
  postMessageCommand,
  type ChatContext,
} from "../index.js";
import { createChatRouter, type ChatProcedureBuilder } from "../router/index.js";

const ctx: ChatContext = {
  tenantId: "11111111-1111-4111-8111-111111111111",
  appId: "22222222-2222-4222-8222-222222222222",
  userId: "33333333-3333-4333-8333-333333333333",
};

const entityId = "44444444-4444-4444-8444-444444444444";
const otherUserId = "55555555-5555-4555-8555-555555555555";
const thirdUserId = "66666666-6666-4666-8666-666666666666";

describe("createRoomCommand", () => {
  it("creates a new room and deduplicates owner and member inserts", async () => {
    const createdRoom = {
      id: "room-1",
      entityType: "JOB",
      entityId,
      title: "Job #101 Chat",
      isPinned: false,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
    };
    const insertValuesCalls: unknown[] = [];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: unknown) => {
          insertValuesCalls.push(vals);
          return {
            returning: vi.fn().mockResolvedValue([createdRoom]),
          };
        }),
      })),
    };

    const result = await createRoomCommand(mockDb as unknown as DbOrTx, ctx, {
      entityType: "JOB",
      entityId,
      title: "Job #101 Chat",
      memberUserIds: [ctx.userId, otherUserId, otherUserId],
    });

    expect(result).toEqual(createdRoom);
    expect(mockDb.insert).toHaveBeenCalledTimes(2);
    const memberRows = insertValuesCalls[1] as Array<{ userId: string; role: string; tenantId: string; appId: string }>;
    expect(memberRows).toHaveLength(2);
    expect(memberRows.find((m) => m.userId === ctx.userId)?.role).toBe("OWNER");
    expect(memberRows.find((m) => m.userId === otherUserId)?.role).toBe("MEMBER");
    expect(memberRows.every((m) => m.tenantId === ctx.tenantId && m.appId === ctx.appId)).toBe(true);
  });

  it("returns existing room when already created for tenant/app/entity", async () => {
    const existingRoom = { id: "room-existing", entityType: "JOB", entityId };
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([existingRoom]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const result = await createRoomCommand(mockDb as unknown as DbOrTx, ctx, {
      entityType: "JOB",
      entityId,
      title: "Job #101 Chat",
    });

    expect(result).toEqual(existingRoom);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});

describe("parseMentionedUserIds & postMessageCommand", () => {
  it("parses UUID mentions, resolves handle lookup, and deduplicates explicit IDs", () => {
    const ids = parseMentionedUserIds(
      `Hey @${otherUserId} and @alex.smith and @unknown_user`,
      [thirdUserId, otherUserId],
      { "alex.smith": thirdUserId }
    );

    expect(ids).toHaveLength(2);
    expect(ids).toContain(otherUserId);
    expect(ids).toContain(thirdUserId);
  });

  it("persists mentionedUserIdsJson and triggers onMentionUsers callback when mentions exist", async () => {
    const onMentionUsers = vi.fn().mockResolvedValue(undefined);
    const savedMsg = { id: "msg-1", roomId: "room-1", body: `Ping @dave` };
    let insertedValues: Record<string, unknown> | undefined;

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
          insertedValues = vals;
          return {
            returning: vi.fn().mockResolvedValue([savedMsg]),
          };
        }),
      }),
    };

    const result = await postMessageCommand(
      mockDb as unknown as DbOrTx,
      ctx,
      {
        roomId: "77777777-7777-4777-8777-777777777777",
        body: "Ping @dave",
        mentionLookup: { dave: otherUserId },
      },
      { onMentionUsers }
    );

    expect(result).toEqual(savedMsg);
    expect(insertedValues?.mentionedUserIdsJson).toEqual([otherUserId]);
    expect(insertedValues?.tenantId).toBe(ctx.tenantId);
    expect(insertedValues?.appId).toBe(ctx.appId);
    expect(onMentionUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        mentionedUserIds: [otherUserId],
        messageId: "msg-1",
      })
    );
  });

  it("does not invoke onMentionUsers when no mentions are found", async () => {
    const onMentionUsers = vi.fn();
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "msg-2" }]),
        }),
      }),
    };

    await postMessageCommand(
      mockDb as unknown as DbOrTx,
      ctx,
      {
        roomId: "77777777-7777-4777-8777-777777777777",
        body: "Plain status update",
      },
      { onMentionUsers }
    );

    expect(onMentionUsers).not.toHaveBeenCalled();
  });
});

describe("RLS tenant/app scoping & router guard", () => {
  it("lists room messages with limit and ordering", async () => {
    const rows = [{ id: "m1", body: "Hello" }];
    const limitMock = vi.fn().mockResolvedValue(rows);
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: limitMock,
            }),
          }),
        }),
      }),
    };

    const result = await listRoomMessagesQuery(mockDb as unknown as DbOrTx, ctx, {
      roomId: "77777777-7777-4777-8777-777777777777",
      limit: 25,
    });

    expect(result).toEqual(rows);
    expect(limitMock).toHaveBeenCalledWith(25);
  });

  it("throws in createChatRouter when tenantId, appId, or userId is missing", async () => {
    type Handler = (opts: { ctx: { db: DbOrTx; tenantId?: string | null; appId?: string; userId?: string }; input?: unknown }) => Promise<unknown>;
    const builder: ChatProcedureBuilder<Handler> = {
      input: () => ({
        query: (fn) => fn as Handler,
        mutation: (fn) => fn as Handler,
      }),
      query: (fn) => fn as Handler,
      mutation: (fn) => fn as Handler,
    };

    const router = createChatRouter({ tenantProcedure: builder });
    const mockDb = {} as unknown as DbOrTx;

    await expect(
      router.getUnreadCounts({ ctx: { db: mockDb, tenantId: null, appId: ctx.appId, userId: ctx.userId } })
    ).rejects.toThrow("Tenant context (tenantId, appId, userId) is required.");

    await expect(
      router.listRoomMessages({
        ctx: { db: mockDb, tenantId: ctx.tenantId, appId: undefined, userId: ctx.userId },
        input: { roomId: "77777777-7777-4777-8777-777777777777" },
      })
    ).rejects.toThrow("Tenant context (tenantId, appId, userId) is required.");
  });
});

describe("getUnreadCountsQuery & markRoomReadCommand", () => {
  it("computes unread counts per room using lastReadAt or epoch fallback", async () => {
    let selectStep = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectStep += 1;
            if (selectStep === 1) {
              return Promise.resolve([{ roomId: "room-a" }, { roomId: "room-b" }]);
            }
            if (selectStep === 2) {
              return Promise.resolve([{ roomId: "room-a", lastReadAt: new Date("2026-11-28T00:00:00Z") }]);
            }
            if (selectStep === 3) {
              return Promise.resolve([{ count: 2 }]);
            }
            return Promise.resolve([{ count: 5 }]);
          }),
        }),
      })),
    };

    const counts = await getUnreadCountsQuery(mockDb as unknown as DbOrTx, ctx);
    expect(counts).toEqual([
      { roomId: "room-a", unreadCount: 2 },
      { roomId: "room-b", unreadCount: 5 },
    ]);
  });

  it("updates existing chatReads row or inserts new one on markRoomReadCommand", async () => {
    const updatedRow = { id: "read-1", roomId: "room-a", userId: ctx.userId };
    const mockDbExisting = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const resUpdated = await markRoomReadCommand(mockDbExisting as unknown as DbOrTx, ctx, {
      roomId: "77777777-7777-4777-8777-777777777777",
    });
    expect(resUpdated).toEqual(updatedRow);
    expect(mockDbExisting.update).toHaveBeenCalledTimes(1);
    expect(mockDbExisting.insert).not.toHaveBeenCalled();

    const createdRow = { id: "read-2", roomId: "room-b", userId: ctx.userId };
    const mockDbNew = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdRow]),
        }),
      }),
    };

    const resCreated = await markRoomReadCommand(mockDbNew as unknown as DbOrTx, ctx, {
      roomId: "77777777-7777-4777-8777-777777777777",
    });
    expect(resCreated).toEqual(createdRow);
    expect(mockDbNew.insert).toHaveBeenCalledTimes(1);
  });
});
