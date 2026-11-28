import type { AppVersionInfo } from "@kaesava/types";
import { getFormattedVersionString } from "@kaesava/config";
import { TRADIE_APP_ID } from "./trpc";

export function getWebVersionInfo(): AppVersionInfo {
  const appId = process.env.NEXT_PUBLIC_APP_ID || TRADIE_APP_ID;
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
  const buildNumber = process.env.NEXT_PUBLIC_BUILD_NUMBER || "1";
  const channelRaw = process.env.NEXT_PUBLIC_RELEASE_CHANNEL || "development";
  const channel = (["development", "preview", "beta", "production"].includes(channelRaw)
    ? channelRaw
    : "development") as AppVersionInfo["channel"];
  const gitCommit = process.env.NEXT_PUBLIC_GIT_COMMIT || "dev";

  const rawInfo: Omit<AppVersionInfo, "formattedVersion"> = {
    appId,
    appName: "Tradie Matters",
    version,
    buildNumber,
    channel,
    gitCommit,
    platform: "web",
  };

  return {
    ...rawInfo,
    formattedVersion: getFormattedVersionString(rawInfo as AppVersionInfo),
  };
}
