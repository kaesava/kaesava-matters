import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@kaesava/ui",
    "@kaesava/i18n",
    "@kaesava/types",
    "@kaesava/core",
    "@kaesava/config",
    "@kaesava/capability-auth",
  ],
  turbopack: {},
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob:",
              process.env.NODE_ENV === "development"
                ? "connect-src 'self' https://api.tradiematters.kaesava.au https://us.i.posthog.com https://*.ingest.us.sentry.io https://*.neonauth.ap-southeast-2.aws.neon.tech http://localhost:* ws://localhost:*"
                : "connect-src 'self' https://api.tradiematters.kaesava.au https://us.i.posthog.com https://*.ingest.us.sentry.io https://*.neonauth.ap-southeast-2.aws.neon.tech",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
