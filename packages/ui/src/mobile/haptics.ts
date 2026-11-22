import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

function hapticsKey(storageKeyPrefix: string): string {
  return `${storageKeyPrefix}-haptics-enabled`;
}

export async function isHapticsEnabled(storageKeyPrefix: string): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(hapticsKey(storageKeyPrefix));
    return val !== "false";
  } catch {
    return true;
  }
}

export async function setHapticsEnabled(storageKeyPrefix: string, enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(hapticsKey(storageKeyPrefix), enabled ? "true" : "false");
  } catch {
    // Ignore storage errors
  }
}

export async function triggerHaptic(storageKeyPrefix: string, style: HapticStyle = "light"): Promise<void> {
  if (!(await isHapticsEnabled(storageKeyPrefix))) return;
  try {
    if (style === "success") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (style === "warning") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else if (style === "error") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (style === "heavy") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (style === "medium") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Ignore unsupported hardware
  }
}
