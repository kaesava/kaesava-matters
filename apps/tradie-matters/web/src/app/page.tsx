import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import "../i18n";
import { TradiePublicHeader } from "../components/TradiePublicHeader";
import { TradiePublicFooter } from "../components/TradiePublicFooter";

function HeroJobPreviewCard() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 text-left space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-[11px] font-extrabold font-mono uppercase tracking-wider text-[#2563eb] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          {t("tradieWeb.previewHeaderBadge")}
        </span>
        <span className="text-xs font-bold text-slate-500">{t("tradieWeb.tagline")}</span>
      </div>
      <div className="grid gap-3">
        <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-[#1B2B4B]">{t("tradieWeb.previewJob1Title")}</span>
          <span className="text-xs font-mono font-bold text-[#2563eb] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 w-fit">
            {t("tradieWeb.previewJob1Status")}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-[#1B2B4B]">{t("tradieWeb.previewJob2Title")}</span>
          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 w-fit">
            {t("tradieWeb.previewJob2Status")}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm font-extrabold text-[#1B2B4B]">{t("tradieWeb.previewJob3Title")}</span>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 w-fit">
            {t("tradieWeb.previewJob3Status")}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeaturesGridSection() {
  const pillars = [
    {
      badge: t("tradieWeb.pillar1Badge"),
      title: t("tradieWeb.pillar1Title"),
      body: t("tradieWeb.pillar1Body"),
      b1: t("tradieWeb.pillar1Bullet1"),
      b2: t("tradieWeb.pillar1Bullet2"),
    },
    {
      badge: t("tradieWeb.pillar2Badge"),
      title: t("tradieWeb.pillar2Title"),
      body: t("tradieWeb.pillar2Body"),
      b1: t("tradieWeb.pillar2Bullet1"),
      b2: t("tradieWeb.pillar2Bullet2"),
    },
    {
      badge: t("tradieWeb.pillar3Badge"),
      title: t("tradieWeb.pillar3Title"),
      body: t("tradieWeb.pillar3Body"),
      b1: t("tradieWeb.pillar3Bullet1"),
      b2: t("tradieWeb.pillar3Bullet2"),
    },
    {
      badge: t("tradieWeb.pillar4Badge"),
      title: t("tradieWeb.pillar4Title"),
      body: t("tradieWeb.pillar4Body"),
      b1: t("tradieWeb.pillar4Bullet1"),
      b2: t("tradieWeb.pillar4Bullet2"),
    },
  ];

  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-20 flex flex-col gap-12 scroll-mt-14">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider shadow-2xs">
          {t("tradieWeb.featuresBadge")}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
          {t("tradieWeb.featuresTitle")}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-medium">
          {t("tradieWeb.featuresSubtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-7">
        {pillars.map((p) => (
          <div
            key={p.badge}
            className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-6"
          >
            <div className="space-y-3">
              <span className="text-[11px] font-extrabold font-mono text-[#2563eb] bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/60 uppercase">
                {p.badge}
              </span>
              <h3 className="text-lg font-black text-[#1B2B4B] leading-snug">{p.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{p.body}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] font-mono font-bold text-slate-700 space-y-1.5">
              <div>✓ {p.b1}</div>
              <div>✓ {p.b2}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingAndTrustSection() {
  const tiers = [
    {
      badge: t("tradieWeb.pricingSoloBadge"),
      title: t("tradieWeb.pricingSoloTitle"),
      price: t("tradieWeb.pricingSoloPrice"),
      annual: t("tradieWeb.pricingSoloAnnual"),
      seat: t("tradieWeb.pricingSoloSeat"),
      featured: false,
    },
    {
      badge: t("tradieWeb.pricingFoundingBadge"),
      title: t("tradieWeb.pricingFoundingTitle"),
      price: t("tradieWeb.pricingFoundingPrice"),
      annual: t("tradieWeb.pricingFoundingAnnual"),
      seat: t("tradieWeb.pricingFoundingSeat"),
      featured: true,
    },
    {
      badge: t("tradieWeb.pricingSmallCrewBadge"),
      title: t("tradieWeb.pricingSmallCrewTitle"),
      price: t("tradieWeb.pricingSmallCrewPrice"),
      annual: t("tradieWeb.pricingSmallCrewAnnual"),
      seat: t("tradieWeb.pricingSmallCrewSeat"),
      featured: false,
    },
  ];

  return (
    <>
      <section id="pricing" className="bg-slate-100/70 border-t border-slate-200/80 py-20 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-10">
          <div className="text-center max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb]">
              {t("tradieWeb.pricingTrialPill")}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("tradieWeb.pricingTitle")}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">{t("tradieWeb.pricingSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 w-full">
            {tiers.map((tier) => (
              <div
                key={tier.title}
                className={`bg-white rounded-3xl p-7 flex flex-col justify-between gap-5 relative overflow-hidden ${
                  tier.featured ? "border-2 border-[#2563eb] shadow-xl" : "border border-slate-200 shadow-sm"
                }`}
              >
                <div className="space-y-3">
                  <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    {tier.badge}
                  </span>
                  <h3 className="text-xl font-black text-[#1B2B4B]">{tier.title}</h3>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-3xl font-black text-[#1B2B4B]">{tier.price}</span>
                    <span className="text-xs font-sans text-slate-500 font-semibold">{tier.annual}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    {tier.seat}
                  </p>
                  <ul className="flex flex-col gap-2 text-xs text-slate-700 font-semibold pt-1">
                    <li>✓ {t("tradieWeb.pricingFeature1")}</li>
                    <li>✓ {t("tradieWeb.pricingFeature2")}</li>
                    <li>✓ {t("tradieWeb.pricingFeature3")}</li>
                    <li>✓ {t("tradieWeb.pricingFeature4")}</li>
                    <li>✓ {t("tradieWeb.pricingFeature5")}</li>
                  </ul>
                </div>
                <Link
                  href="/sign-up"
                  className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-3.5 rounded-2xl shadow-sm text-sm transition-all text-center block"
                >
                  {t("tradieWeb.heroCtaPrimary")}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-medium text-center">{t("tradieWeb.pricingCancelNote")}</p>
        </div>
      </section>

      <section id="security" className="bg-white border-y border-slate-200/90 py-20 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 max-w-xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase">
              {t("tradieWeb.trustBadge")}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#1B2B4B]">{t("tradieWeb.trustTitle")}</h3>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">{t("tradieWeb.trustSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 space-y-2">
              <h4 className="font-extrabold text-[#1B2B4B] text-sm">{t("tradieWeb.trust1Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{t("tradieWeb.trust1Desc")}</p>
            </div>
            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 space-y-2">
              <h4 className="font-extrabold text-[#1B2B4B] text-sm">{t("tradieWeb.trust2Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{t("tradieWeb.trust2Desc")}</p>
            </div>
            <div className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 space-y-2">
              <h4 className="font-extrabold text-[#1B2B4B] text-sm">{t("tradieWeb.trust3Title")}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{t("tradieWeb.trust3Desc")}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#1B2B4B] font-sans selection:bg-[#2563eb] selection:text-white">
      <TradiePublicHeader isLanding />

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
            href="/sign-in"
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

        <HeroJobPreviewCard />
      </section>

      <FeaturesGridSection />
      <PricingAndTrustSection />
      <TradiePublicFooter showConversionBanner />
    </div>
  );
}
