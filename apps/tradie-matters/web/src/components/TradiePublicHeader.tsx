"use client";

import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Logo } from "@kaesava/ui/web";
import "../i18n";

export interface TradiePublicHeaderProps {
  isLanding?: boolean;
}

export function TradiePublicHeader({ isLanding = false }: TradiePublicHeaderProps) {
  return (
    <header
      className={
        isLanding
          ? "border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-2xs"
          : "w-full bg-[#1B2B4B] border-b border-white/10 sticky top-0 z-40 shadow-md"
      }
    >
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo size="md" brandName={t("tradieWeb.appName")} src="/tradie-matters-icon.svg" />
          <span
            className={`text-xl font-extrabold tracking-tight transition-colors ${
              isLanding
                ? "text-[#1B2B4B] group-hover:text-[#2563eb]"
                : "text-white group-hover:text-blue-200"
            }`}
          >
            {t("tradieWeb.appName")}
          </span>
        </Link>

        {isLanding ? (
          <nav className="hidden md:flex items-center gap-2 text-xs">
            <a
              href="#features"
              className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/70 transition-all"
            >
              {t("tradieWeb.navFeatures")}
            </a>
            <a
              href="#pricing"
              className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/70 transition-all"
            >
              {t("tradieWeb.navPricing")}
            </a>
            <a
              href="#security"
              className="px-3 py-1.5 rounded-xl font-bold text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/70 transition-all"
            >
              {t("tradieWeb.navTrust")}
            </a>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {!isLanding && (
            <Link
              href="/"
              className="text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all"
            >
              {t("public.backToHome")}
            </Link>
          )}
          <Link
            href="/sign-in"
            className={`text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl transition-colors ${
              isLanding
                ? "text-slate-600 hover:text-[#1B2B4B] hover:bg-slate-100/80"
                : "text-white bg-[#2563eb] hover:bg-blue-600 shadow-xs"
            }`}
          >
            {t("auth.signIn")}
          </Link>
          {isLanding && (
            <Link
              href="/sign-up"
              className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs hover:shadow-md"
            >
              {t("auth.signUp")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
