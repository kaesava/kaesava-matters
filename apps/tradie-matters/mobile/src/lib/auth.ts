import { createMobileAuthClient, createBiometricLockStore } from "@kaesava/mobile-core";

const NEON_AUTH_URL = process.env["EXPO_PUBLIC_NEON_AUTH_URL"];

export const DEFAULT_AUTH_ORIGIN = __DEV__
  ? "http://localhost:3010"
  : "https://tradiematters.kaesava.au";

export const AUTH_ORIGIN = process.env["EXPO_PUBLIC_AUTH_ORIGIN"] || DEFAULT_AUTH_ORIGIN;

if (!NEON_AUTH_URL) {
  throw new Error(
    "EXPO_PUBLIC_NEON_AUTH_URL is not set. Add it to apps/tradie-matters/mobile/.env.development"
  );
}

export const authClient = createMobileAuthClient({
  baseURL: NEON_AUTH_URL,
  origin: AUTH_ORIGIN,
  scheme: "tradiematters",
  storagePrefix: "tradie-matters",
});

export const biometricLock = createBiometricLockStore({
  prefKey: "tradie_matters_biometric_lock",
  defaultPromptMessage: "Unlock Tradie Matters",
});
