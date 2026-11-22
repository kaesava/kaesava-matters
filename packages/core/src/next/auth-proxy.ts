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
  earlyAccessAllowedPrefixes?: readonly string[];
  earlyAccessRedirectPath?: string;
  signInPath?: string;
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
  const earlyAccessAllowed = options.earlyAccessAllowedPrefixes ?? ["/blog"];
  if (!isAuthEnabled && pathname !== "/" && !earlyAccessAllowed.some((p) => pathname.startsWith(p))) {
    return { action: "redirect", redirectPath: options.earlyAccessRedirectPath ?? "/?early_access=true" };
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
    const signInPath = options.signInPath ?? "/sign-in";
    return {
      action: "redirect",
      redirectPath: `${signInPath}?redirect=${encodeURIComponent(pathname)}`,
    };
  }

  return { action: "next" };
}
