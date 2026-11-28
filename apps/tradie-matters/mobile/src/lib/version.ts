import Constants from "expo-constants";
import { Platform } from "react-native";
import { getFormattedVersionString } from "@kaesava/config";
import type { AppVersionInfo } from "@kaesava/types";

const TRADIE_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";

export function getMobileVersionInfo(): AppVersionInfo {
  const appId = process.env["EXPO_PUBLIC_APP_ID"] || TRADIE_APP_ID;
  const version =
    Constants.expoConfig?.version || process.env["EXPO_PUBLIC_APP_VERSION"] || "1.0.0";
  const buildNumberRaw =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;
  const buildNumber = buildNumberRaw
    ? String(buildNumberRaw)
    : process.env["EXPO_PUBLIC_BUILD_NUMBER"] || "1";
  const channelRaw = process.env["EXPO_PUBLIC_RELEASE_CHANNEL"] || "development";
  const channel = (
    ["development", "preview", "beta", "production"].includes(channelRaw)
      ? channelRaw
      : "development"
  ) as AppVersionInfo["channel"];

  const rawInfo: AppVersionInfo = {
    appId,
    appName: "Tradie Matters Mobile",
    version,
    buildNumber,
    channel,
    gitCommit: process.env["EXPO_PUBLIC_GIT_COMMIT"] || "dev",
    platform: Platform.OS === "ios" ? "ios" : "android",
    formattedVersion: "",
  };

  return {
    ...rawInfo,
    formattedVersion: getFormattedVersionString(rawInfo),
  };
}
