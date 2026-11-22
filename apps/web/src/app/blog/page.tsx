import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Logo } from "@kaesava/ui/web";
import { BLOG_POSTS } from "../../lib/blog-data";

export const metadata: Metadata = {
  title: "Blog — Household Cashflow Philosophy & Guides",
  description:
    "Four honest reads from the founder on skipping daily receipt tracking, protecting your bills on payday, and sharing a household budget without losing privacy.",
  alternates: {
    canonical: "https://moneymatters.kaesava.au/blog",
  },
  openGraph: {
    title: "Blog | Money Matters",
    description:
      "Honest founder stories on zero-guilt household cashflow, payday allocation, and financial calm.",
    url: "https://moneymatters.kaesava.au/blog",
    type: "website",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://moneymatters.kaesava.au" },
              { "@type": "ListItem", position: 2, name: "Blog", item: "https://moneymatters.kaesava.au/blog" },
            ],
          }),
        }}
      />

      {/* Header */}
      <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("app.title")}
            </span>
            <span className="text-xs font-bold font-mono text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {t("landing.blogBadge")}
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-bold text-slate-600 hover:text-[#1B2B4B] transition-colors"
            >
              {t("public.backToHome")}
            </Link>
            <Link
              href="/sign-up"
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              {t("landing.createAccount")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase">
          {t("landing.blogFromFounderBadge")}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1B2B4B]">
          {t("landing.blogFromFounderTitle")}
        </h1>
        <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
          {t("landing.blogFromFounderSubtitle")}
        </p>
      </section>

      {/* 2x2 Blog Cards Grid */}
      <main className="max-w-5xl mx-auto px-6 pb-20 flex-1 w-full space-y-12">
        <div className="grid md:grid-cols-2 gap-7">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="p-7 rounded-2xl bg-white border border-[#e2e4e0] shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-6 group h-full"
              >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold font-mono">
                  <span className="text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 uppercase">
                    {post.category}
                  </span>
                  <span className="text-slate-500">
                    {t("landing.blogReadTime", { minutes: post.readTimeMinutes })}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors leading-snug">
                  {post.title}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {post.excerpt}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-500">
                  {post.authorName} · {post.publishedAt}
                </span>
                <span className="font-bold text-[#2563eb] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  {t("landing.blogReadMore")}
                </span>
              </div>
              </Link>
            </article>
          ))}
        </div>

        {/* Bottom 60-Day Trial Retention CTA */}
        <section className="p-8 md:p-10 rounded-3xl bg-[#1B2B4B] text-white text-center space-y-4 shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t("landing.blogCtaTitle")}
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {t("landing.blogCtaDesc")}
          </p>
          <div className="pt-2">
            <Link
              href="/sign-up"
              className="inline-block bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl transition-all shadow-md"
            >
              {t("landing.createAccount")} →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold">
              {t("landing.footerLegalEntity")}
            </span>
          </div>
          <div className="flex gap-4 font-semibold">
            <Link href="/" className="hover:underline text-[#2563eb]">{t("nav.home")}</Link>
            <Link href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:underline text-[#2563eb]">{t("landing.footerTerms")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
