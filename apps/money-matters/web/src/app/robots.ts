import type { MetadataRoute } from "next";

const DISALLOWED_PATHS = [
  "/dashboard/",
  "/api/",
  "/dev-callback/",
  "/auth-callback/",
  "/invite/",
  "/setup",
  "/complete-profile",
  "/forgot-password",
  "/reset-password",
  "/subscription/success",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://moneymatters.kaesava.au";

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
