import { NextRequest, NextResponse } from "next/server";
import { evaluateAuthEdgeProxy } from "@kaesava/core/next";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/auth-callback",
  ...(process.env.NODE_ENV !== "production" ? ["/dev-callback/"] : []),
  "/invite/",
  "/api/",
  "/blog",
];

export function proxy(request: NextRequest) {
  const decision = evaluateAuthEdgeProxy(
    request.nextUrl.pathname,
    (name) => Boolean(request.cookies.get(name)),
    {
      publicPrefixes: PUBLIC_PREFIXES,
      isAuthEnabled: process.env.NEXT_PUBLIC_ENABLE_AUTH !== "false",
    }
  );

  if (decision.action === "redirect" && decision.redirectPath) {
    return NextResponse.redirect(new URL(decision.redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/setup/:path*", "/complete-profile/:path*", "/subscription/:path*"],
};
