import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  return process.env["NEXT_PUBLIC_NEON_AUTH_URL"] || "http://localhost:3010";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [emailOTPClient()],
});
