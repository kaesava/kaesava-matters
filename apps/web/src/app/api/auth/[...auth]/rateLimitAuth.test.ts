import { describe, it, expect, vi, beforeEach } from "vitest";
import { enforceAuthProxyRateLimit } from "./rateLimitAuth";

vi.mock("@money-matters/core", async () => {
  const actual = await vi.importActual<typeof import("@money-matters/core")>("@money-matters/core");
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  };
});

import { checkRateLimit } from "@money-matters/core";

describe("enforceAuthProxyRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces IP and hashed email limits for OTP send endpoints", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 4 });

    const res = await enforceAuthProxyRateLimit(
      "/email-otp/request-password-reset",
      "203.0.113.10",
      JSON.stringify({ email: "User@Example.COM" })
    );

    expect(res).toBeNull();
    expect(checkRateLimit).toHaveBeenCalledTimes(2);
    expect(checkRateLimit).toHaveBeenNthCalledWith(1, "auth:otp-ip:203.0.113.10", 5, 900, undefined);
    const secondKey = vi.mocked(checkRateLimit).mock.calls[1]?.[0];
    expect(secondKey).toMatch(/^auth:otp-email:[a-f0-9]{24}$/);
    expect(secondKey).not.toContain("user@example.com");
  });

  it("returns 429 with Retry-After when OTP send email limit is exceeded", async () => {
    vi.mocked(checkRateLimit)
      .mockResolvedValueOnce({ allowed: true, remaining: 1 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0 });

    const res = await enforceAuthProxyRateLimit(
      "/email-otp/request-password-reset",
      "203.0.113.10",
      JSON.stringify({ email: "user@example.com" })
    );

    expect(res).not.toBeNull();
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("900");
  });

  it("enforces stricter reset-password verification limits", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0 });

    const res = await enforceAuthProxyRateLimit(
      "/email-otp/reset-password",
      "203.0.113.10",
      "{}"
    );

    expect(res?.status).toBe(429);
    expect(checkRateLimit).toHaveBeenCalledWith("reset-password:203.0.113.10", 10, 900, undefined);
  });

  it("falls back to general auth limit for other POST auth endpoints", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 29 });

    const res = await enforceAuthProxyRateLimit("/sign-in/email", "203.0.113.10", "{}");

    expect(res).toBeNull();
    expect(checkRateLimit).toHaveBeenCalledWith("auth:203.0.113.10", 30, 60, undefined);
  });
});
