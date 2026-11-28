import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { jwtClient, emailOTPClient } from "better-auth/client/plugins";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface CreateMobileAuthClientOptions {
  baseURL: string;
  origin: string;
  scheme: string;
  storagePrefix: string;
  cookiePrefix?: string[];
}

/**
 * Creates a parameterized Better Auth / Neon Auth client for React Native (Expo).
 */
export function createMobileAuthClient(options: CreateMobileAuthClientOptions) {
  return createAuthClient({
    baseURL: options.baseURL,
    fetchOptions: {
      headers: {
        Origin: options.origin,
      },
    },
    plugins: [
      expoClient({
        scheme: options.scheme,
        storage: SecureStore,
        storagePrefix: options.storagePrefix,
        cookiePrefix: options.cookiePrefix ?? ["neon-auth", "better-auth"],
      }) as unknown as ReturnType<typeof jwtClient>,
      jwtClient(),
      emailOTPClient(),
    ],
  });
}

export interface CreateBiometricLockStoreOptions {
  prefKey: string;
  defaultPromptMessage: string;
  inactivityTimeoutMs?: number;
}

const DEFAULT_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

async function checkBiometricsAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

async function getBiometricTypeLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face Unlock";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "Fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "Iris Scanner";
    return "Biometrics";
  } catch {
    return "Biometrics";
  }
}

/**
 * Creates an app-scoped biometric lock store backed by Expo LocalAuthentication and SecureStore.
 */
export function createBiometricLockStore(options: CreateBiometricLockStoreOptions) {
  const timeoutMs = options.inactivityTimeoutMs ?? DEFAULT_INACTIVITY_TIMEOUT_MS;
  let backgroundTimestamp: number | null = null;
  let isAppUnlockedInSession = false;

  async function isBiometricLockEnabled(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(options.prefKey)) === "true";
    } catch {
      return false;
    }
  }

  async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
    try {
      if (enabled) await SecureStore.setItemAsync(options.prefKey, "true");
      else await SecureStore.deleteItemAsync(options.prefKey);
    } catch {
      // ignore SecureStore errors
    }
  }

  async function authenticateWithBiometrics(promptMessage = options.defaultPromptMessage): Promise<boolean> {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use Device PIN / Pattern",
        disableDeviceFallback: false,
      });
      if (!res.success) return false;
      isAppUnlockedInSession = true;
      backgroundTimestamp = null;
      return true;
    } catch {
      return false;
    }
  }

  function recordBackgroundTimestamp(): void {
    backgroundTimestamp = Date.now();
  }

  function shouldPromptBiometricLock(): boolean {
    if (!isAppUnlockedInSession) return true;
    if (!backgroundTimestamp) return false;
    return Date.now() - backgroundTimestamp >= timeoutMs;
  }

  function markSessionUnlocked(): void {
    isAppUnlockedInSession = true;
    backgroundTimestamp = null;
  }

  function resetBiometricSession(): void {
    isAppUnlockedInSession = false;
    backgroundTimestamp = null;
  }

  return {
    checkBiometricsAvailable,
    getBiometricTypeLabel,
    isBiometricLockEnabled,
    setBiometricLockEnabled,
    authenticateWithBiometrics,
    recordBackgroundTimestamp,
    shouldPromptBiometricLock,
    markSessionUnlocked,
    resetBiometricSession,
  };
}

export type PushPlatform = "ios" | "android";

/** Resolves the push notification platform identifier for the current device. */
export function getPushPlatform(): PushPlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}

/**
 * Unregisters a cached push device token via the supplied mutation and clears it from SecureStore.
 */
export async function unregisterAppPushToken(
  removeTokenFn: (input: { platform: PushPlatform; token: string }) => Promise<unknown>,
  storageKey = "push_device_token"
): Promise<void> {
  try {
    const cachedToken = await SecureStore.getItemAsync(storageKey).catch(() => null);
    if (!cachedToken) return;
    await removeTokenFn({ platform: getPushPlatform(), token: cachedToken }).catch(() => {});
    await SecureStore.deleteItemAsync(storageKey).catch(() => {});
  } catch {
    // SecureStore unavailable
  }
}
