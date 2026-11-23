import { resolveAppConfigOrDefault } from "@kaesava/config";

export function handleDevCallbackRequest(
  url: URL,
  isDev: boolean,
  baseHeaders: Record<string, string>,
  appId?: string | null
): Response {
  if (!isDev) {
    return new Response(JSON.stringify({ error: "Endpoint disabled in production." }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }

  const app = resolveAppConfigOrDefault(appId);
  const appSchemeName = app.branding.deepLinkScheme.replace(/:\/\/$/, "");
  const rawPath = url.pathname.replace(/^\/dev-callback\/?/, "");

  if (rawPath.startsWith(`${appSchemeName}/`) || rawPath.startsWith("exp/")) {
    const scheme = rawPath.startsWith("exp/") ? "exp://" : app.branding.deepLinkScheme;
    const subPath = rawPath.startsWith("exp/")
      ? rawPath.slice(4)
      : rawPath.slice(appSchemeName.length + 1);
    const requestedRedirect = url.searchParams.get("redirect_to");
    const targetBase = requestedRedirect || `${scheme}${subPath}`;
    const targetUrl = new URL(targetBase);

    url.searchParams.forEach((val, key) => {
      if (key !== "redirect_to") {
        targetUrl.searchParams.set(key, val);
      }
    });

    return Response.redirect(targetUrl.toString(), 302);
  }

  const segments = rawPath.split("/");
  if (segments.length >= 2) {
    const proto = decodeURIComponent(segments[0]);
    const hostAndPath = decodeURIComponent(segments.slice(1).join("/"));
    const hostOnly = hostAndPath.split("/")[0].split(":")[0];
    const isAllowedHost =
      hostOnly === "localhost" ||
      hostOnly === "127.0.0.1" ||
      hostOnly.endsWith(".kaesava.au") ||
      hostOnly.endsWith(".ts.net");
    if (!isAllowedHost) {
      return new Response(JSON.stringify({ error: "Forbidden host." }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }

    const customTarget = url.searchParams.get("target") || "/auth-callback";
    try {
      const targetUrl = new URL(customTarget, `${proto}://${hostAndPath}`);
      url.searchParams.forEach((val, key) => {
        if (key !== "target") {
          targetUrl.searchParams.set(key, val);
        }
      });
      return Response.redirect(targetUrl.toString(), 302);
    } catch {
      // Fallback
    }
  }

  return Response.redirect(`${app.branding.appUrl}/dashboard`, 302);
}
