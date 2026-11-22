import { tenantProcedure, requiresWriteAccess } from '../trpc/trpc.js';
import { notificationsProcedures } from "@kaesava/capability-notifications/router";
import { sendNotificationEmail } from "@kaesava/core";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { inngest } from "../inngest/client.js";

export const notificationsRouter = {
  getNotificationChannelStatus: tenantProcedure.query(async ({ ctx }) => {
    const handler = notificationsProcedures.getNotificationChannelStatus.execute(ctx.db);
    return await handler(ctx.tenantId!, ctx.userId!, ctx.email!, ctx.appId);
  }),

  registerToken: tenantProcedure
    .input(notificationsProcedures.registerToken.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = notificationsProcedures.registerToken.execute(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  removeToken: tenantProcedure
    .input(notificationsProcedures.removeToken.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = notificationsProcedures.removeToken.execute(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!, ctx.appId);
    }),

  sendTestNotification: tenantProcedure
    .input(notificationsProcedures.sendTestNotification.input)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const status = await notificationsProcedures.getNotificationChannelStatus.execute(ctx.db)(
        ctx.tenantId!,
        ctx.userId!,
        ctx.email!,
        ctx.appId
      );
      const dispatchedChannels: string[] = [];
      let emailDispatched = false;
      let pushDispatched = false;

      if ((input.channel === 'email' || input.channel === 'all') && status.emailRecipient) {
        const appConfig = resolveAppConfigOrDefault(ctx.appId);
        await sendNotificationEmail(
          status.emailRecipient,
          `🔔 Test Notification — ${appConfig.name}`,
          'This is a test notification confirming your email delivery channel is operational and connected.',
          ctx.appId
        );
        dispatchedChannels.push('email');
        emailDispatched = true;
      }

      if ((input.channel === 'push' || input.channel === 'all') && status.mobilePushDeviceCount > 0) {
        await inngest.send({
          name: 'notification/send-push',
          data: {
            userId: ctx.userId!,
            tenantId: ctx.tenantId!,
            title: '🔔 Test Notification',
            body: 'Your notification pipeline is connected and working!',
            data: { route: '/(app)/home' },
          },
        }).catch(() => {});
        dispatchedChannels.push('push');
        pushDispatched = true;
      }

      return {
        success: true,
        message: 'Test notification dispatched.',
        dispatchedChannels,
        emailRecipient: status.emailRecipient,
        emailDispatched,
        mobilePushDeviceCount: status.mobilePushDeviceCount,
        pushDispatched,
      };
    }),
};


