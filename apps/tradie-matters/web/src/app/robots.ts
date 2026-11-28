import type { MetadataRoute } from "next";

const DISALLOWED_PATHS = [
  "/dashboard/",
  "/api/",
  "/auth-callback/",
  "/invite/",
  "/q/",
  "/i/",
  "/setup",
  "/complete-profile",
  "/forgot-password",
  "/reset-password",
  "/subscription/",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://tradiematters.kaesava.au";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
