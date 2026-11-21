export const DEFAULT_AUTH_SESSION_COOKIE_NAMES = [
  "__Secure-neon-auth.session_token",
  "neon-auth.session_token",
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "session_token",
  "__Secure-session_token",
  "neon_auth_session",
  "session",
  "__Secure-session",
] as const;

export interface AuthEdgeProxyOptions {
  publicPrefixes: readonly string[];
  allowRoot?: boolean;
  isAuthEnabled?: boolean;
  sessionCookieNames?: readonly string[];
}

export interface AuthEdgeDecision {
  action: "next" | "redirect";
  redirectPath?: string;
}

export function evaluateAuthEdgeProxy(
  pathname: string,
  hasCookie: (name: string) => boolean,
  options: AuthEdgeProxyOptions
): AuthEdgeDecision {
  const isAuthEnabled = options.isAuthEnabled ?? true;
  if (!isAuthEnabled && pathname !== "/" && !pathname.startsWith("/blog")) {
    return { action: "redirect", redirectPath: "/?early_access=true" };
  }

  if ((options.allowRoot ?? true) && pathname === "/") {
    return { action: "next" };
  }

  if (options.publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return { action: "next" };
  }

  const cookieNames = options.sessionCookieNames ?? DEFAULT_AUTH_SESSION_COOKIE_NAMES;
  const hasSession = cookieNames.some((name) => hasCookie(name));

  if (!hasSession) {
    return {
      action: "redirect",
      redirectPath: `/sign-in?redirect=${encodeURIComponent(pathname)}`,
    };
  }

  return { action: "next" };
}
