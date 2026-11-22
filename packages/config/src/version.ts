import { AppVersionInfo } from "@kaesava/types";

const RELEASE_CHANNELS = new Set<AppVersionInfo["channel"]>([
  "development",
  "preview",
  "beta",
  "production",
]);

/** Formats AppVersionInfo into a user-facing concise string (e.g. "v1.0.0-beta.1 (#42)"). */
export function getFormattedVersionString(version: AppVersionInfo): string {
  return `v${version.version} (#${version.buildNumber})`;
}

/** Builds normalized AppVersionInfo consistently across Web and Mobile. */
export function buildAppVersionInfo(params: {
  appId?: string;
  appName: string;
  version?: string;
  buildNumber?: string;
  channelRaw?: string;
  gitCommit?: string;
  platform: AppVersionInfo["platform"];
}): AppVersionInfo {
  const channel: AppVersionInfo["channel"] = RELEASE_CHANNELS.has(
    params.channelRaw as AppVersionInfo["channel"]
  )
    ? (params.channelRaw as AppVersionInfo["channel"])
    : "development";

  const info: Omit<AppVersionInfo, "formattedVersion"> = {
    appId: params.appId || "unknown-app",
    appName: params.appName,
    version: params.version || "1.0.0-beta.1",
    buildNumber: params.buildNumber || "1",
    channel,
    gitCommit: params.gitCommit || "dev",
    platform: params.platform,
  };

  return {
    ...info,
    formattedVersion: getFormattedVersionString(info as AppVersionInfo),
  };
}
