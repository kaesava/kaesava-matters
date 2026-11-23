import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuthProxyHandlers, type AuthProxyEnv } from "@kaesava/core/next";

const ALLOWED_ORIGINS = [
  "https://tradiematters.kaesava.au",
  "https://api.tradiematters.kaesava.au",
  ...(process.env.NODE_ENV !== "production"
    ? [
        "http://localhost:3010",
        "http://127.0.0.1:3010",
        "http://localhost:3011",
        "http://127.0.0.1:3011",
      ]
    : []),
];

export const { GET, POST, OPTIONS } = createAuthProxyHandlers({
  allowedOrigins: ALLOWED_ORIGINS,
  getCloudflareEnv: async () => {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env as unknown as AuthProxyEnv;
  },
});
