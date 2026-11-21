import { Platform } from 'react-native';

type PlatformKey = 'android' | 'ios';

interface PlatformStyleValues {
  /** Minimum interactive target (dp). Material = 48, HIG = 44. */
  minTouch: number;
  /** Standard text-field height (dp). */
  fieldHeight: number;
  /** Bottom padding fallback when no safe-area inset is available. */
  sheetBottomPadding: number;
  /** Ripple colour for Pressable on Android; undefined elsewhere. */
  rippleColor: string | undefined;
  /** Distance from screen bottom for toasts so they clear the tab bar. */
  toastBottomOffset: number;
  /** Material 3 active pill behind bottom tab bar icon (Android only). */
  tabActiveIndicator: boolean;
}

const VALUES: Record<PlatformKey, PlatformStyleValues> = {
  android: { minTouch: 48, fieldHeight: 52, sheetBottomPadding: 16, rippleColor: 'rgba(15, 23, 42, 0.12)', toastBottomOffset: 96, tabActiveIndicator: true },
  ios: { minTouch: 44, fieldHeight: 48, sheetBottomPadding: 32, rippleColor: undefined, toastBottomOffset: 96, tabActiveIndicator: false },
};

// Single platform branch point: add iOS-specific tuning in VALUES.ios, never inline Platform.OS in components.
export const PLATFORM_STYLE: PlatformStyleValues = Platform.OS === 'android' ? VALUES.android : VALUES.ios;

export function getRipple(color?: string): { color: string; borderless: false } | undefined {
  const resolved = color ?? PLATFORM_STYLE.rippleColor;
  return resolved ? { color: resolved, borderless: false } : undefined;
}
