import { describe, it, expect } from "vitest";
import {
  SignInInputSchema,
  SignUpInputSchema,
  CompleteProfileInputSchema,
  CheckEmailAuthProviderInputSchema,
  SetAccountPasswordInputSchema,
  SetAccountPasswordFormSchema,
  ChangeAccountPasswordFormSchema,
  ResetPasswordInputSchema,
  evaluatePasswordStrength,
  isValidEmail,
  mapOtpSendErrorKey,
  mapOtpResetErrorKey,
} from "./auth.types.js";

describe("auth.types DTOs & Validation", () => {
  describe("SignInInputSchema", () => {
    it("accepts valid email and non-empty password", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "user@example.com",
        password: "secretpassword",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "notanemail",
        password: "secretpassword",
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects empty password", () => {
      const parsed = SignInInputSchema.safeParse({
        email: "user@example.com",
        password: "",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("SignUpInputSchema", () => {
    it("accepts valid payload when passwords match and terms accepted", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects when password is less than 8 characters", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Pass1",
        confirmPassword: "Pass1",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects when passwords do not match", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
        agreedToTerms: true,
      });
      expect(parsed.success).toBe(false);
    });

    it("rejects when agreedToTerms is not true", () => {
      const parsed = SignUpInputSchema.safeParse({
        name: "Jane Doe",
        country: "AU",
        email: "jane@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        agreedToTerms: false,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("ResetPasswordInputSchema", () => {
    it("accepts valid email, 6-digit otp, and matching 8+ char passwords", () => {
      const parsed = ResetPasswordInputSchema.safeParse({
        email: "user@example.com",
        otp: "123456",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid email or non-6-digit otp", () => {
      expect(
        ResetPasswordInputSchema.safeParse({
          email: "invalid-email",
          otp: "123456",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        }).success
      ).toBe(false);

      expect(
        ResetPasswordInputSchema.safeParse({
          email: "user@example.com",
          otp: "123",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        }).success
      ).toBe(false);
    });

    it("rejects when confirmPassword differs", () => {
      const parsed = ResetPasswordInputSchema.safeParse({
        email: "user@example.com",
        otp: "123456",
        password: "NewPassword123!",
        confirmPassword: "MismatchPassword123!",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("evaluatePasswordStrength", () => {
    it("scores properly based on rules", () => {
      const weak = evaluatePasswordStrength("abc");
      expect(weak.score).toBe(1); // lowercase only
      expect(weak.hasMinLength).toBe(false);

      const strong = evaluatePasswordStrength("StrongPassword123!");
      expect(strong.score).toBe(4);
      expect(strong.hasMinLength).toBe(true);
      expect(strong.hasLower).toBe(true);
      expect(strong.hasUpper).toBe(true);
      expect(strong.hasNumberOrSpecial).toBe(true);
    });
  });

  describe("isValidEmail", () => {
    it("returns true for valid email formats", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("test.user+tag@moneymatters.kaesava.au")).toBe(true);
      expect(isValidEmail("  valid@domain.co  ")).toBe(true);
    });

    it("returns false for invalid email formats or empty strings", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("   ")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
      expect(isValidEmail("user@domain")).toBe(false);
    });
  });

  describe("mapOtpSendErrorKey", () => {
    it("maps nullish to null, 429 to tooManyRequests, and other errors to forgotPasswordSendFailed", () => {
      expect(mapOtpSendErrorKey(null)).toBeNull();
      expect(mapOtpSendErrorKey(undefined)).toBeNull();
      expect(mapOtpSendErrorKey({ status: 429 })).toBe("auth.tooManyRequests");
      expect(mapOtpSendErrorKey({ status: 502 })).toBe("auth.forgotPasswordSendFailed");
    });
  });

  describe("mapOtpResetErrorKey", () => {
    it("maps 429, 403/TOO_MANY_ATTEMPTS, OTP_EXPIRED, and fallback invalidOtp", () => {
      expect(mapOtpResetErrorKey({ status: 429 })).toBe("auth.tooManyRequests");
      expect(mapOtpResetErrorKey({ status: 403 })).toBe("auth.tooManyOtpAttempts");
      expect(mapOtpResetErrorKey({ code: "TOO_MANY_ATTEMPTS" })).toBe("auth.tooManyOtpAttempts");
      expect(mapOtpResetErrorKey({ code: "OTP_EXPIRED" })).toBe("auth.otpExpired");
      expect(mapOtpResetErrorKey({ code: "INVALID_OTP" })).toBe("auth.invalidOtp");
      expect(mapOtpResetErrorKey(null)).toBe("auth.invalidOtp");
    });
  });

  describe("CompleteProfileInputSchema", () => {
    it("accepts valid name, country, and agreedToTerms", () => {
      expect(
        CompleteProfileInputSchema.safeParse({
          name: "Jane Doe",
          country: "AU",
          agreedToTerms: true,
        }).success
      ).toBe(true);
    });

    it("rejects short name or unaccepted terms", () => {
      expect(
        CompleteProfileInputSchema.safeParse({
          name: "J",
          country: "AU",
          agreedToTerms: true,
        }).success
      ).toBe(false);
      expect(
        CompleteProfileInputSchema.safeParse({
          name: "Jane Doe",
          country: "AU",
          agreedToTerms: false,
        }).success
      ).toBe(false);
    });
  });

  describe("CheckEmailAuthProviderInputSchema", () => {
    it("accepts valid email and rejects invalid email", () => {
      expect(CheckEmailAuthProviderInputSchema.safeParse({ email: "jane@example.com" }).success).toBe(true);
      expect(CheckEmailAuthProviderInputSchema.safeParse({ email: "invalid" }).success).toBe(false);
    });
  });

  describe("Account Password Schemas", () => {
    it("validates SetAccountPasswordInputSchema length bounds", () => {
      expect(SetAccountPasswordInputSchema.safeParse({ newPassword: "Password123!" }).success).toBe(true);
      expect(SetAccountPasswordInputSchema.safeParse({ newPassword: "short" }).success).toBe(false);
    });

    it("validates SetAccountPasswordFormSchema matching passwords", () => {
      expect(
        SetAccountPasswordFormSchema.safeParse({
          password: "Password123!",
          confirmPassword: "Password123!",
        }).success
      ).toBe(true);
      expect(
        SetAccountPasswordFormSchema.safeParse({
          password: "Password123!",
          confirmPassword: "OtherPassword123!",
        }).success
      ).toBe(false);
    });

    it("validates ChangeAccountPasswordFormSchema requires current password and matching new passwords", () => {
      expect(
        ChangeAccountPasswordFormSchema.safeParse({
          currentPassword: "OldPassword1!",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        }).success
      ).toBe(true);
      expect(
        ChangeAccountPasswordFormSchema.safeParse({
          currentPassword: "",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!",
        }).success
      ).toBe(false);
    });
  });
});
