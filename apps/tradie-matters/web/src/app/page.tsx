import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import "../i18n";
import { TradiePublicHeader } from "../components/TradiePublicHeader";
import { TradiePublicFooter } from "../components/TradiePublicFooter";
import { TradiePricingSection } from "../components/TradiePricingSection";
import { TradieHeroPreview } from "../components/TradieHeroPreview";
import {
  TradesStripSection,
  FeaturesShowcaseSection,
  AuComplianceSection,
  WhySwitchComparisonSection,
  TrustSection,
} from "../components/TradieLandingSections";
import { TradieFaqSection, getTradieFaqItems } from "../components/TradieFaqSection";

function buildStructuredData() {
  const baseUrl = "https://tradiematters.kaesava.au";
  const faqItems = getTradieFaqItems();

  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Tradie Matters",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      url: baseUrl,
      description:
        "Flat-rate job management, quoting, live job costing, offline field tools, two-way Xero/MYOB/QuickBooks sync, and PayID/PayTo invoicing for Australian tradies.",
      offers: [
        {
          "@type": "Offer",
          name: "Solo Plan",
          price: "9.95",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Small Crew Plan",
          price: "24.95",
          priceCurrency: "AUD",
          availability: "https://schema.org/InStock",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Tradie Matters",
      url: baseUrl,
      logo: `${baseUrl}/icon-512x512.png`,
      email: "info@tradiematters.kaesava.au",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ];
}

export default function HomePage() {
  const structuredData = buildStructuredData();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <TradiePublicHeader isLanding />

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 text-center flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
            {t("tradieWeb.heroBadge")}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#1B2B4B] tracking-tight max-w-4xl leading-[1.12]">
            {t("tradieWeb.heroTitlePart1")}{" "}
            <span className="text-[#2563eb] underline decoration-blue-200 decoration-wavy decoration-2 underline-offset-8">
              {t("tradieWeb.heroTitleSpan")}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-medium space-y-1">
            <span className="block">{t("tradieWeb.heroSubtitle1")}</span>
            <span className="block text-sm text-slate-500 pt-1">{t("tradieWeb.heroSubtitle2")}</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/sign-up"
              className="bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg text-sm"
            >
              {t("tradieWeb.heroCtaPrimary")}
            </Link>
            <Link
              href="#pricing"
              className="bg-white hover:bg-slate-50 text-[#1B2B4B] border border-slate-200 font-extrabold px-7 py-3.5 rounded-2xl transition-all shadow-2xs text-sm"
            >
              {t("tradieWeb.heroCtaSecondary")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs font-bold text-slate-600">
            <span>✦ {t("tradieWeb.reassuranceTrial")}</span>
            <span>⚡ {t("tradieWeb.reassuranceNoCard")}</span>
            <span>🛡️ {t("tradieWeb.reassurancePrivacy")}</span>
          </div>

          <TradieHeroPreview />
        </section>

        <TradesStripSection />
        <FeaturesShowcaseSection />
        <AuComplianceSection />
        <WhySwitchComparisonSection />

        <section id="pricing" className="bg-slate-100/70 border-t border-slate-200/80 py-20 scroll-mt-14">
          <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-6">
            <TradiePricingSection mode="landing" />
            <div className="max-w-4xl w-full rounded-2xl bg-white border border-slate-200/90 p-5 text-center space-y-1 shadow-2xs">
              <p className="text-xs font-extrabold text-[#1B2B4B] uppercase tracking-wider">
                {t("tradieWeb.pricingSmsAddonTitle")}
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                {t("tradieWeb.pricingSmsAddonDesc")}
              </p>
            </div>
          </div>
        </section>

        <TrustSection />
        <TradieFaqSection />
      </main>

      <TradiePublicFooter showConversionBanner />
    </div>
  );
}
