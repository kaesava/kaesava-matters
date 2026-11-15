import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Logo } from "@money-matters/ui/web";
import { BLOG_POSTS } from "../../../lib/blog-data";
import { BlogReadTracker } from "../../../components/web/BlogReadTracker";

const BASE_URL = "https://moneymatters.kaesava.au";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return { title: t("landing.blogArticleNotFound") };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${BASE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${BASE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.authorName],
    },
  };
}

export default async function BlogPostReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F7F8FA] text-[#1B2B4B]">
        <h1 className="text-2xl font-bold mb-2">{t("landing.blogArticleNotFound")}</h1>
        <p className="text-xs text-slate-500 mb-4">{t("landing.blogArticleNotFoundDesc")}</p>
        <Link
          href="/blog"
          className="bg-[#2563eb] text-white font-bold text-xs px-4 py-2 rounded-xl"
        >
          {t("landing.blogBackToBlog")}
        </Link>
      </div>
    );
  }

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  const wordCount = post.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      <BlogReadTracker slug={post.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: `${BASE_URL}/blog/${post.slug}/opengraph-image`,
            wordCount,
            author: { "@type": "Person", name: post.authorName, jobTitle: post.authorRole },
            publisher: { "@type": "Organization", name: "Money Matters Australia", url: BASE_URL },
            datePublished: post.publishedAt,
            dateModified: post.publishedAt,
            mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${post.slug}` },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
              { "@type": "ListItem", position: 3, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
            ],
          }),
        }}
      />

      {/* Header */}
      <header className="border-b border-[#e2e4e0] bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("app.title")}
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="text-xs font-bold text-[#2563eb] hover:underline">
              {t("landing.blogBackToBlog")}
            </Link>
            <Link
              href="/sign-up"
              className="hidden sm:inline-block bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all"
            >
              {t("landing.createAccount")}
            </Link>
          </div>
        </div>
      </header>

      {/* Article Container */}
      <main className="max-w-3xl mx-auto px-6 pt-8 pb-20 flex-1 w-full space-y-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/" className="hover:text-[#2563eb] transition-colors">{t("nav.home")}</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#2563eb] transition-colors">{t("nav.blog")}</Link>
          <span>/</span>
          <span className="text-[#1B2B4B] font-bold truncate max-w-[240px] sm:max-w-md">{post.title}</span>
        </nav>

        <div className="space-y-4 border-b border-[#e2e4e0] pb-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold font-mono">
            <span className="text-[#2563eb] bg-blue-50 px-3 py-1 rounded-md border border-blue-100 uppercase">
              {post.category}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{t("landing.blogReadTime", { minutes: post.readTimeMinutes })}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{post.publishedAt}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B] leading-tight">
            {post.title}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            {post.subtitle}
          </p>

          <div className="flex items-center gap-3 pt-3">
            <div className="w-10 h-10 rounded-full bg-[#1B2B4B] text-white flex items-center justify-center font-bold text-sm font-mono shadow-xs">
              {post.authorName[0]}
            </div>
            <div>
              <p className="text-xs font-bold text-[#1B2B4B]">{post.authorName}</p>
              <p className="text-[11px] text-slate-500">{post.authorRole}</p>
            </div>
          </div>
        </div>

        {/* Article Body */}
        <article className="space-y-6 text-base text-slate-700 leading-8">
          {post.paragraphs.map((para, idx) => (
            <p key={idx}>{para}</p>
          ))}
        </article>

        {/* Key Takeaways Card */}
        {post.keyTakeaways.length > 0 && (
          <div className="p-6 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
            <h2 className="text-xs font-bold text-[#2563eb] uppercase tracking-wider">
              {t("landing.blogKeyTakeaways")}
            </h2>
            <ul className="space-y-2 text-sm font-medium text-[#1B2B4B]">
              {post.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#2563eb] font-bold">✓</span>
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Conversion Banner */}
        <div className="p-8 rounded-2xl bg-[#1B2B4B] text-white text-center space-y-4 shadow-lg">
          <h3 className="text-xl sm:text-2xl font-bold">{t("landing.blogCtaTitle")}</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            {t("landing.blogCtaDesc")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Link
              href="/sign-up"
              className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md inline-block"
            >
              {t("landing.createAccount")} →
            </Link>
            <Link
              href="/#simulator"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-5 py-3 rounded-xl border border-white/20 transition-all inline-block"
            >
              {t("landing.blogTrySimulatorCta")}
            </Link>
          </div>
        </div>

        {/* Keep Reading (Retention Loop) */}
        <section className="pt-4 space-y-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
            {t("landing.blogNextRead")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {relatedPosts.map((rel) => (
              <Link
                key={rel.slug}
                href={`/blog/${rel.slug}`}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all space-y-2 group"
              >
                <span className="text-[10px] font-bold font-mono text-[#2563eb] uppercase">
                  {rel.category}
                </span>
                <h3 className="text-sm font-bold text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors leading-snug">
                  {rel.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2">{rel.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e4e0] bg-[#F7F8FA] py-8 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-semibold">{t("landing.footerLegalEntity")}</span>
          <div className="flex gap-4 font-semibold">
            <Link href="/blog" className="hover:underline text-[#2563eb]">{t("landing.blogAllArticles")}</Link>
            <Link href="/privacy" className="hover:underline text-[#2563eb]">{t("landing.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:underline text-[#2563eb]">{t("landing.footerTerms")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
