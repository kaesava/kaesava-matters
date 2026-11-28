import { notificationsProcedures } from "@kaesava/capability-notifications/router";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { sendNotificationEmail } from "@kaesava/core";
import { inngest } from "../inngest/client.js";
import { requiresWriteAccess, tenantProcedure } from "../trpc/trpc.js";

export const notificationsRouter = {
  getNotificationChannelStatus: tenantProcedure.query(async ({ ctx }) => {
    const handler = notificationsProcedures.getNotificationChannelStatus.execute(ctx.db);
    return handler(ctx.tenantId, ctx.userId, ctx.email ?? "", ctx.appId);
  }),

  registerToken: tenantProcedure
    .input(notificationsProcedures.registerToken.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = notificationsProcedures.registerToken.execute(ctx.db);
      return handler(input, ctx.tenantId, ctx.appId, ctx.userId);
    }),

  removeToken: tenantProcedure
    .input(notificationsProcedures.removeToken.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = notificationsProcedures.removeToken.execute(ctx.db);
      return handler(input, ctx.tenantId, ctx.userId, ctx.appId);
    }),

  sendTestNotification: tenantProcedure
    .input(notificationsProcedures.sendTestNotification.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const status = await notificationsProcedures.getNotificationChannelStatus.execute(ctx.db)(
        ctx.tenantId,
        ctx.userId,
        ctx.email ?? "",
        ctx.appId
      );
      const dispatchedChannels: string[] = [];

      if ((input.channel === "email" || input.channel === "all") && status.emailRecipient) {
        const appConfig = resolveAppConfigOrDefault(ctx.appId);
        await sendNotificationEmail(
          status.emailRecipient,
          `Test Notification — ${appConfig.name}`,
          "This is a test notification confirming your email delivery channel is operational.",
          ctx.appId
        );
        dispatchedChannels.push("email");
      }

      if ((input.channel === "push" || input.channel === "all") && status.mobilePushDeviceCount > 0) {
        await inngest
          .send({
            name: "notification/send-push",
            data: {
              userId: ctx.userId,
              tenantId: ctx.tenantId,
              title: "Test Notification",
              body: "Your notification pipeline is connected and working!",
              data: { route: "/(app)/home" },
            },
          })
          .catch(() => {});
        dispatchedChannels.push("push");
      }

      return {
        success: true,
        dispatchedChannels,
        emailRecipient: status.emailRecipient,
        mobilePushDeviceCount: status.mobilePushDeviceCount,
      };
    }),
};
