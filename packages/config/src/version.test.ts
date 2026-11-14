import { describe, it, expect } from "vitest";
import { buildAppVersionInfo, getFormattedVersionString } from "./version";
import { AppVersionInfo } from "@money-matters/types";

describe("Version Config Utilities", () => {
  it("formats version info into readable string", () => {
    const info: AppVersionInfo = {
      appId: "01908bde-34bb-7b19-a178-574211bc93aa",
      appName: "Money Matters",
      version: "1.0.0-beta.1",
      buildNumber: "42",
      channel: "beta",
      gitCommit: "a1b2c3d",
      platform: "web",
      formattedVersion: "v1.0.0-beta.1 (#42)",
    };

    expect(getFormattedVersionString(info)).toBe("v1.0.0-beta.1 (#42)");
  });

  it("normalizes invalid channels to development in buildAppVersionInfo", () => {
    const built = buildAppVersionInfo({
      appName: "Money Matters",
      channelRaw: "invalid",
      platform: "web",
      version: "2.0.0",
      buildNumber: "7",
    });
    expect(built.channel).toBe("development");
    expect(built.formattedVersion).toBe("v2.0.0 (#7)");
  });
});
