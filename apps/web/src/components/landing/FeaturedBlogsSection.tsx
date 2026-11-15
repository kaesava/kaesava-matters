"use client";

import Link from "next/link";
import { t } from "@money-matters/i18n";
import { BLOG_POSTS } from "../../lib/blog-data";
import { BookOpen } from "lucide-react";

/**
 * Compact 4-card founder philosophy strip on the landing page linking into /blog.
 */
export function FeaturedBlogsSection() {
  return (
    <section
      className="max-w-6xl mx-auto px-6 py-16 flex flex-col gap-10"
      aria-label="From the Founder"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t("landing.blogFromFounderBadge")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1B2B4B]">
            {t("landing.blogFromFounderTitle")}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("landing.blogFromFounderSubtitle")}
          </p>
        </div>
        <Link
          href="/blog"
          className="text-xs font-extrabold text-[#2563eb] hover:underline shrink-0"
        >
          {t("landing.blogViewAll")}
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between gap-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-bold font-mono">
                <span className="text-[#2563eb] uppercase">{post.category}</span>
                <span className="text-slate-400">
                  {t("landing.blogReadTime", { minutes: post.readTimeMinutes })}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#1B2B4B] group-hover:text-[#2563eb] transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {post.excerpt}
              </p>
            </div>
            <span className="text-xs font-bold text-[#2563eb] group-hover:translate-x-0.5 transition-transform inline-block">
              {t("landing.blogReadMore")}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
