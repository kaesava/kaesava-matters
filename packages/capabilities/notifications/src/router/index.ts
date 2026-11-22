import { z } from "zod";
import {
  registerDeviceTokenHandler,
  removeDeviceTokenHandler,
  getNotificationChannelStatusHandler,
} from "../index";

export const registerTokenInput = z
  .object({
    platform: z.enum(["ios", "android", "web"]),
    token: z.string().min(1, "Push token is required"),
  })
  .strict();

export const removeTokenInput = z
  .object({
    platform: z.enum(["ios", "android", "web"]),
    token: z.string().optional(),
  })
  .strict();

export const sendTestNotificationInput = z
  .object({
    channel: z.enum(["email", "push", "all"]),
  })
  .strict();

export const notificationsProcedures = {
  getNotificationChannelStatus: {
    execute: getNotificationChannelStatusHandler,
  },
  registerToken: {
    input: registerTokenInput,
    execute: registerDeviceTokenHandler,
  },
  removeToken: {
    input: removeTokenInput,
    execute: removeDeviceTokenHandler,
  },
  sendTestNotification: {
    input: sendTestNotificationInput,
  },
} as const;
