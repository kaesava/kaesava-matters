import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { getPushPlatform, unregisterAppPushToken, type PushPlatform } from "@kaesava/mobile-core";
import { logger } from "./logger";

export { getPushPlatform, type PushPlatform };

const PUSH_TOKEN_KEY = "tradie_push_device_token";

export async function unregisterCachedPushToken(
  removeTokenFn: (input: { platform: PushPlatform; token: string }) => Promise<unknown>
): Promise<void> {
  await unregisterAppPushToken(removeTokenFn, PUSH_TOKEN_KEY);
}

export async function registerPushNotificationsAsync(): Promise<string | null> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    logger.info("[PUSH] Running in Expo Go client — remote push notifications bypassed.");
    return null;
  }
  try {
    const Notifications = (await import("expo-notifications")) as typeof import("expo-notifications");
    let finalStatus = (await Notifications.getPermissionsAsync()).status;
    if (finalStatus !== "granted") {
      finalStatus = (await Notifications.requestPermissionsAsync()).status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      resolveAppConfigOrDefault().easProjectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => {});
    return token;
  } catch (err) {
    logger.warn("[PUSH] Failed to register push token:", err);
    return null;
  }
}

export async function initPushNotificationHandlers(
  onNavigate?: (url: string) => void
): Promise<(() => void) | undefined> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return undefined;
  try {
    const Notifications = (await import("expo-notifications")) as typeof import("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as { url?: string; route?: string } | undefined;
      const target = data?.url || data?.route;
      if (target && onNavigate) onNavigate(target);
    });
    return () => sub.remove();
  } catch (err) {
    logger.warn("[PUSH] Failed to initialize notification handlers:", err);
    return undefined;
  }
}
