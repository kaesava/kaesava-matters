import { fileNotesProcedures } from "@kaesava/capability-file-notes/router";
import { privateTenantProcedure, router } from "../trpc/trpc.js";

export const fileNotesRouter = router({
  createPreSignedUrl: privateTenantProcedure
    .input(fileNotesProcedures.createPreSignedUrl.input)
    .mutation(async ({ ctx, input }) => {
      return fileNotesProcedures.createPreSignedUrl.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input
      );
    }),

  create: privateTenantProcedure
    .input(fileNotesProcedures.create.input)
    .output(fileNotesProcedures.create.output)
    .mutation(async ({ ctx, input }) => {
      return fileNotesProcedures.create.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input
      );
    }),

  list: privateTenantProcedure
    .input(fileNotesProcedures.list.input)
    .output(fileNotesProcedures.list.output)
    .query(async ({ ctx, input }) => {
      return fileNotesProcedures.list.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input
      );
    }),

  getDownloadUrl: privateTenantProcedure
    .input(fileNotesProcedures.getDownloadUrl.input)
    .query(async ({ ctx, input }) => {
      return fileNotesProcedures.getDownloadUrl.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input.id
      );
    }),

  updateComment: privateTenantProcedure
    .input(fileNotesProcedures.updateComment.input)
    .output(fileNotesProcedures.updateComment.output)
    .mutation(async ({ ctx, input }) => {
      return fileNotesProcedures.updateComment.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input
      );
    }),

  archive: privateTenantProcedure
    .input(fileNotesProcedures.archive.input)
    .mutation(async ({ ctx, input }) => {
      return fileNotesProcedures.archive.execute(
        ctx.db,
        { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId },
        input.id
      );
    }),

  getStorageQuota: privateTenantProcedure
    .output(fileNotesProcedures.getStorageQuota.output)
    .query(async ({ ctx }) => {
      return fileNotesProcedures.getStorageQuota.execute(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      });
    }),
});
