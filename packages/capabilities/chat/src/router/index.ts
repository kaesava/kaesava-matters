import { z } from "zod";
import type { DbOrTx } from "@kaesava/db/rings/capabilities";
import {
  CreateChatRoomInput,
  ListRoomMessagesInput,
  MarkRoomReadInput,
  PostChatMessageInput,
  createRoomCommand,
  getUnreadCountsQuery,
  listRoomMessagesQuery,
  markRoomReadCommand,
  postMessageCommand,
  type OnMentionUsersCallback,
} from "../index.js";

export interface ChatProcedureContext {
  db: DbOrTx;
  tenantId?: string | null;
  appId?: string;
  userId?: string;
}

export interface ChatProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: ChatProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: ChatProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: ChatProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: ChatProcedureContext }) => Promise<TOut>): TProc;
}

export interface CreateChatRouterDeps<TProc> {
  tenantProcedure: ChatProcedureBuilder<TProc>;
  onMentionUsers?: OnMentionUsersCallback;
}

function requireChatCtx(ctx: ChatProcedureContext) {
  if (!ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new Error("Tenant context (tenantId, appId, userId) is required.");
  }
  return { db: ctx.db, tenantId: ctx.tenantId, appId: ctx.appId, userId: ctx.userId };
}

export function createChatRouter<TProc>(deps: CreateChatRouterDeps<TProc>) {
  return {
    createRoom: deps.tenantProcedure
      .input(CreateChatRoomInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireChatCtx(ctx);
        return createRoomCommand(c.db, c, input);
      }),
    postMessage: deps.tenantProcedure
      .input(PostChatMessageInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireChatCtx(ctx);
        return postMessageCommand(c.db, c, input, { onMentionUsers: deps.onMentionUsers });
      }),
    listRoomMessages: deps.tenantProcedure
      .input(ListRoomMessagesInput)
      .query(async ({ ctx, input }) => {
        const c = requireChatCtx(ctx);
        return listRoomMessagesQuery(c.db, c, input);
      }),
    markRoomRead: deps.tenantProcedure
      .input(MarkRoomReadInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireChatCtx(ctx);
        return markRoomReadCommand(c.db, c, input);
      }),
    getUnreadCounts: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireChatCtx(ctx);
      return getUnreadCountsQuery(c.db, c);
    }),
  };
}
