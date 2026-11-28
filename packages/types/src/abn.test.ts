import { describe, expect, it } from "vitest";
import {
  AustralianAbnSchema,
  formatAbnDisplay,
  isValidAustralianAbn,
  normalizeAbnDigits,
} from "./abn.js";

describe("Australian ABN utilities", () => {
  it("normalizes ABN strings by stripping non-digit characters", () => {
    expect(normalizeAbnDigits("51 824 753 556")).toBe("51824753556");
    expect(normalizeAbnDigits("51-824-753-556")).toBe("51824753556");
    expect(normalizeAbnDigits("abn: 53004085616")).toBe("53004085616");
    expect(normalizeAbnDigits("")).toBe("");
  });

  it("validates official ATO ABN checksums", () => {
    expect(isValidAustralianAbn("51 824 753 556")).toBe(true);
    expect(isValidAustralianAbn("51824753556")).toBe(true);
    expect(isValidAustralianAbn("53 004 085 616")).toBe(true);
    expect(isValidAustralianAbn("53-004-085-616")).toBe(true);
  });

  it("rejects invalid checksums, wrong lengths, and non-numeric inputs", () => {
    expect(isValidAustralianAbn("51 824 753 557")).toBe(false);
    expect(isValidAustralianAbn("1234567890")).toBe(false);
    expect(isValidAustralianAbn("123456789012")).toBe(false);
    expect(isValidAustralianAbn("not-an-abn")).toBe(false);
    expect(isValidAustralianAbn("")).toBe(false);
  });

  it("formats 11-digit ABNs as XX XXX XXX XXX and preserves trimmed non-11-digit input", () => {
    expect(formatAbnDisplay("51824753556")).toBe("51 824 753 556");
    expect(formatAbnDisplay("51-824-753-556")).toBe("51 824 753 556");
    expect(formatAbnDisplay("  12345  ")).toBe("12345");
  });

  it("parses and transforms valid ABNs with AustralianAbnSchema and rejects invalid ones", () => {
    expect(AustralianAbnSchema.parse(" 51 824 753 556 ")).toBe("51824753556");
    const invalid = AustralianAbnSchema.safeParse("51 824 753 557");
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("Invalid Australian Business Number (ABN)");
    }
  });
});
