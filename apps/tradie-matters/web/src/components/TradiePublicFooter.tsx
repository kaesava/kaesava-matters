"use client";

import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Logo } from "@kaesava/ui/web";
import "../i18n";

export function TradiePublicFooter({ showConversionBanner = false }: { showConversionBanner?: boolean }) {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {showConversionBanner && (
        <section className="bg-[#1B2B4B] text-white py-16 text-center">
          <div className="max-w-3xl mx-auto px-6 flex flex-col items-center gap-5">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              {t("tradieWeb.conversionTitle")}
            </h2>
            <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed">
              {t("tradieWeb.conversionDesc")}
            </p>
            <Link
              href="/sign-up"
              className="bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg text-sm mt-2"
            >
              {t("tradieWeb.heroCtaPrimary")}
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 bg-[#F7F8FA] py-8 text-center text-xs text-slate-500 font-sans w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Logo size="sm" brandName={t("tradieWeb.appName")} src="/tradie-matters-icon.svg" />
              <span className="font-semibold text-slate-700">
                © {currentYear} {t("tradieWeb.appName")}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="text-slate-500">{t("tradieWeb.footerLegalEntity")}</span>
            </div>
            <span className="text-[11px] text-slate-400">{t("tradieWeb.footerDisclaimer")}</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-4 font-medium">
            <Link href="/" className="hover:text-[#2563eb] transition-colors">
              {t("nav.home")}
            </Link>
            <Link href="/terms" prefetch={false} className="hover:text-[#2563eb] transition-colors">
              {t("tradieWeb.footerTerms")}
            </Link>
            <Link href="/privacy" prefetch={false} className="hover:text-[#2563eb] transition-colors">
              {t("tradieWeb.footerPrivacy")}
            </Link>
            <span className="text-[#2563eb] font-semibold">{t("tradieWeb.footerSupportEmail")}</span>
          </nav>
        </div>
      </footer>
    </>
  );
}
