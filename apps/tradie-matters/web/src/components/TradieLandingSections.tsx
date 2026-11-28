import React from "react";
import { t } from "@kaesava/i18n";
import "../i18n";

export function TradesStripSection() {
  const trades = [
    t("tradieWeb.tradeElectrical"),
    t("tradieWeb.tradePlumbing"),
    t("tradieWeb.tradeCarpentry"),
    t("tradieWeb.tradeHvac"),
    t("tradieWeb.tradeLandscaping"),
    t("tradieWeb.tradeMaintenance"),
  ];

  return (
    <section className="border-y border-slate-200/80 bg-white py-8">
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4 text-center">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          {t("tradieWeb.tradesStripHeading")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {trades.map((trade) => (
            <span
              key={trade}
              className="px-3.5 py-1.5 rounded-full bg-[#F7F8FA] border border-slate-200 text-xs font-bold text-[#1B2B4B]"
            >
              {trade}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 font-medium max-w-2xl">
          {t("tradieWeb.tradesStripSubtext")}
        </p>
      </div>
    </section>
  );
}

export function FeaturesShowcaseSection() {
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
    {
      badge: t("tradieWeb.pillar5Badge"),
      title: t("tradieWeb.pillar5Title"),
      body: t("tradieWeb.pillar5Body"),
      b1: t("tradieWeb.pillar5Bullet1"),
      b2: t("tradieWeb.pillar5Bullet2"),
    },
    {
      badge: t("tradieWeb.pillar6Badge"),
      title: t("tradieWeb.pillar6Title"),
      body: t("tradieWeb.pillar6Body"),
      b1: t("tradieWeb.pillar6Bullet1"),
      b2: t("tradieWeb.pillar6Bullet2"),
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.map((p) => (
          <div
            key={p.badge}
            className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <span className="text-[11px] font-extrabold font-mono text-[#2563eb] bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-200/60 uppercase">
                {p.badge}
              </span>
              <h3 className="text-lg font-black text-[#1B2B4B] leading-snug">{p.title}</h3>
              <p className="text-slate-600 text-xs leading-relaxed">{p.body}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-[11px] font-semibold text-slate-700 space-y-1.5">
              <div>✓ {p.b1}</div>
              <div>✓ {p.b2}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AuComplianceSection() {
  const cards = [
    { title: t("tradieWeb.auCard1Title"), desc: t("tradieWeb.auCard1Desc") },
    { title: t("tradieWeb.auCard2Title"), desc: t("tradieWeb.auCard2Desc") },
    { title: t("tradieWeb.auCard3Title"), desc: t("tradieWeb.auCard3Desc") },
  ];

  return (
    <section className="bg-[#1B2B4B] text-white py-16">
      <div className="max-w-6xl mx-auto px-6 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-blue-200 bg-white/10 px-3 py-1 rounded-full">
            {t("tradieWeb.auBadge")}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{t("tradieWeb.auTitle")}</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{t("tradieWeb.auSubtitle")}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div key={card.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <h3 className="font-extrabold text-base text-white">{card.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhySwitchComparisonSection() {
  const rows = [
    { label: t("tradieWeb.compareRow1Label"), tm: t("tradieWeb.compareRow1Tm"), perUser: t("tradieWeb.compareRow1PerUser"), jobCap: t("tradieWeb.compareRow1JobCap") },
    { label: t("tradieWeb.compareRow2Label"), tm: t("tradieWeb.compareRow2Tm"), perUser: t("tradieWeb.compareRow2PerUser"), jobCap: t("tradieWeb.compareRow2JobCap") },
    { label: t("tradieWeb.compareRow3Label"), tm: t("tradieWeb.compareRow3Tm"), perUser: t("tradieWeb.compareRow3PerUser"), jobCap: t("tradieWeb.compareRow3JobCap") },
    { label: t("tradieWeb.compareRow4Label"), tm: t("tradieWeb.compareRow4Tm"), perUser: t("tradieWeb.compareRow4PerUser"), jobCap: t("tradieWeb.compareRow4JobCap") },
    { label: t("tradieWeb.compareRow5Label"), tm: t("tradieWeb.compareRow5Tm"), perUser: t("tradieWeb.compareRow5PerUser"), jobCap: t("tradieWeb.compareRow5JobCap") },
  ];

  return (
    <section id="compare" className="max-w-6xl mx-auto px-6 py-20 scroll-mt-14">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] uppercase tracking-wider">
          {t("tradieWeb.compareBadge")}
        </div>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
          {t("tradieWeb.compareTitle")}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
          {t("tradieWeb.compareSubtitle")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <th className="p-4 font-extrabold">{t("tradieWeb.compareColFeature")}</th>
              <th className="p-4 font-black text-[#2563eb] bg-blue-50/60">{t("tradieWeb.compareColTm")}</th>
              <th className="p-4 font-extrabold">{t("tradieWeb.compareColPerUser")}</th>
              <th className="p-4 font-extrabold">{t("tradieWeb.compareColJobCap")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="p-4 font-bold text-[#1B2B4B]">{row.label}</td>
                <td className="p-4 font-extrabold text-[#1B2B4B] bg-blue-50/30">{row.tm}</td>
                <td className="p-4 text-slate-600">{row.perUser}</td>
                <td className="p-4 text-slate-600">{row.jobCap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TrustSection() {
  const items = [
    { title: t("tradieWeb.trust1Title"), desc: t("tradieWeb.trust1Desc") },
    { title: t("tradieWeb.trust2Title"), desc: t("tradieWeb.trust2Desc") },
    { title: t("tradieWeb.trust3Title"), desc: t("tradieWeb.trust3Desc") },
  ];

  return (
    <section id="security" className="bg-white border-y border-slate-200/90 py-20 scroll-mt-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase">
            {t("tradieWeb.trustBadge")}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#1B2B4B]">{t("tradieWeb.trustTitle")}</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">{t("tradieWeb.trustSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.title} className="p-6 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 space-y-2">
              <h3 className="font-extrabold text-[#1B2B4B] text-sm">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
