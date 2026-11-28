import React from "react";
import { t } from "@kaesava/i18n";
import "../i18n";

export function getTradieFaqItems() {
  return [
    { q: t("tradieWeb.faq1Q"), a: t("tradieWeb.faq1A") },
    { q: t("tradieWeb.faq2Q"), a: t("tradieWeb.faq2A") },
    { q: t("tradieWeb.faq3Q"), a: t("tradieWeb.faq3A") },
    { q: t("tradieWeb.faq4Q"), a: t("tradieWeb.faq4A") },
    { q: t("tradieWeb.faq5Q"), a: t("tradieWeb.faq5A") },
    { q: t("tradieWeb.faq6Q"), a: t("tradieWeb.faq6A") },
    { q: t("tradieWeb.faq7Q"), a: t("tradieWeb.faq7A") },
  ];
}

export function TradieFaqSection() {
  const items = getTradieFaqItems();

  return (
    <section id="faq" className="max-w-4xl mx-auto px-6 py-20 scroll-mt-14">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
          {t("tradieWeb.faqBadge")}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
          {t("tradieWeb.faqTitle")}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
          {t("tradieWeb.faqSubtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl bg-white border border-slate-200/90 p-5 shadow-2xs open:shadow-sm transition-all"
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-extrabold text-sm sm:text-base text-[#1B2B4B]">
              <span>{item.q}</span>
              <span className="text-[#2563eb] font-mono text-lg leading-none group-open:rotate-45 transition-transform">
                +
              </span>
            </summary>
            <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
