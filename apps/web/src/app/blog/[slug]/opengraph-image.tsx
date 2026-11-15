import { ImageResponse } from "next/og";
import { BLOG_POSTS } from "../../../lib/blog-data";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BlogOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  const title = post?.title ?? "Money Matters — Household Cashflow Philosophy";
  const category = post?.category ?? "FOUNDER BLOG";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#F7F8FA",
          color: "#1B2B4B",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              backgroundColor: "#eff6ff",
              border: "2px solid #bfdbfe",
              color: "#2563eb",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {category}
          </div>
        </div>

        <div
          style={{
            fontSize: "54px",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#1B2B4B",
            maxWidth: "1020px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #e2e8f0",
            paddingTop: "28px",
            fontSize: "24px",
            fontWeight: 700,
            color: "#475569",
          }}
        >
          <span style={{ color: "#1B2B4B" }}>Money Matters · moneymatters.kaesava.au</span>
          <span style={{ color: "#2563eb" }}>60-Day Free Trial · No Card Required</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
