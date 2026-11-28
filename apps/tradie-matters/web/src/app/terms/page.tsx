import type { Metadata } from "next";
import React from "react";
import { t } from "@kaesava/i18n";
import "../../i18n";
import { TradiePublicHeader } from "../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../components/TradiePublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Tradie Matters Terms of Service, 14-day free trial terms, Australian Consumer Law guarantees, and Victorian governing law.",
  alternates: { canonical: "https://tradiematters.kaesava.au/terms" },
};

export default function TradieTermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white flex flex-col justify-between">
      <TradiePublicHeader />

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10 flex-1 w-full">
        <div>
          <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
            {t("terms.complianceBadge")}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B2B4B]">
            {t("terms.title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium">
            {t("terms.lastUpdated")}
          </p>
        </div>

        <div className="p-6 bg-amber-50/80 border border-amber-200/90 rounded-3xl shadow-xs space-y-3">
          <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
            <span>⚖️</span> {t("tradieWeb.terms.disclaimerBoxTitle")}
          </h2>
          <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
            {t("tradieWeb.terms.disclaimerBoxBody")}
          </p>
        </div>

        <section className="space-y-8 text-sm leading-relaxed text-slate-700 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section1Title")}</h2>
            <p>{t("tradieWeb.terms.section1Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section2Title")}</h2>
            <p>{t("tradieWeb.terms.section2Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("tradieWeb.terms.section2Item1")}</li>
              <li>{t("tradieWeb.terms.section2Item2")}</li>
              <li>{t("tradieWeb.terms.section2Item3")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("tradieWeb.terms.section3Title")}</h2>
            <p>{t("tradieWeb.terms.section3Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("tradieWeb.terms.section3Item1")}</li>
              <li>{t("tradieWeb.terms.section3Item2")}</li>
              <li>{t("tradieWeb.terms.section3Item3")}</li>
              <li>{t("terms.section3Item4")}</li>
              <li>{t("terms.section3Item5")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section4Title")}</h2>
            <p>{t("tradieWeb.terms.section4Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("tradieWeb.terms.section5Title")}</h2>
            <p>{t("tradieWeb.terms.section5Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section6Title")}</h2>
            <p>{t("terms.section6Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section7Title")}</h2>
            <p>{t("tradieWeb.terms.section7Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section8Title")}</h2>
            <p>{t("terms.section8Intro")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>{t("terms.section8Item1")}</li>
              <li>{t("terms.section8Item2")}</li>
              <li>{t("terms.section8Item3")}</li>
              <li>{t("terms.section8Item4")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section9Title")}</h2>
            <p>{t("tradieWeb.terms.section9Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section10Title")}</h2>
            <p>{t("terms.section10Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section11Title")}</h2>
            <p>{t("terms.section11Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section12Title")}</h2>
            <p>{t("tradieWeb.terms.section12Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("tradieWeb.terms.section13Title")}</h2>
            <p>{t("tradieWeb.terms.section13Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section14Title")}</h2>
            <p>{t("tradieWeb.terms.section14Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("terms.section15Title")}</h2>
            <p>{t("terms.section15Body")}</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-[#2563eb] font-bold">
              {t("tradieWeb.terms.section15Email")}
            </div>
          </div>
        </section>
      </main>

      <TradiePublicFooter />
    </div>
  );
}
