import { z } from "zod";

export const NotificationChannelStatusSchema = z.object({
  emailRecipient: z.string(),
  usesCustomNotificationEmail: z.boolean(),
  mobilePushDeviceCount: z.number().int().min(0),
}).strict();

export type NotificationChannelStatus = z.infer<typeof NotificationChannelStatusSchema>;

