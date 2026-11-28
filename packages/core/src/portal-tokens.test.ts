import { describe, expect, it } from "vitest";
import { generatePortalToken, hashPortalToken } from "./portal-tokens.js";

describe("portal-tokens", () => {
  it("generates a high-entropy base64url token and matching SHA-256 hex hash", async () => {
    const { rawToken, tokenHash } = await generatePortalToken();

    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    await expect(hashPortalToken(rawToken)).resolves.toBe(tokenHash);
  });

  it("produces unique tokens on consecutive calls", async () => {
    const first = await generatePortalToken();
    const second = await generatePortalToken();

    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).not.toBe(second.tokenHash);
  });

  it("hashes inputs deterministically using SHA-256", async () => {
    const emptyHash = await hashPortalToken("");
    expect(emptyHash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );

    const a1 = await hashPortalToken("portal-token-alpha");
    const a2 = await hashPortalToken("portal-token-alpha");
    const b = await hashPortalToken("portal-token-beta");

    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
    expect(a1).toMatch(/^[0-9a-f]{64}$/);
  });
});
