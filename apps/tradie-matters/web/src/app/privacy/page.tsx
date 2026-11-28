import type { Metadata } from "next";
import React from "react";
import { t } from "@kaesava/i18n";
import { LegalDocumentLayout } from "@kaesava/ui/web";
import "../../i18n";
import { TradiePublicHeader } from "../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../components/TradiePublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tradie Matters protects trade business and customer data under the Australian Privacy Principles (APPs) and Privacy Act 1988 (Cth).",
  alternates: { canonical: "https://tradiematters.kaesava.au/privacy" },
};

export default function TradiePrivacyPolicyPage() {
  return (
    <LegalDocumentLayout
      title={t("privacy.pageTitle")}
      lastUpdated={t("privacy.effectiveDate")}
      entityName="KSHETRAPALAPURAM, KALYANARAMAN KAESAVA (Individual/Sole Trader, VIC 3030, Australia)"
      jurisdiction="Victoria, Australia"
      headerSlot={<TradiePublicHeader />}
      footerSlot={<TradiePublicFooter />}
    >
      <div className="space-y-8">
        <div className="ui-card p-6 space-y-3">
          <h3 className="text-base font-bold text-[#1B2B4B]">🔒 {t("privacy.commitmentTitle")}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {t("tradieWeb.privacy.commitmentBody")}
          </p>
        </div>

        <section className="space-y-8 text-sm leading-relaxed text-slate-700 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section1Title")}</h2>
            <p>{t("tradieWeb.privacy.section1Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section2Title")}</h2>
            <p>{t("tradieWeb.privacy.section2Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>{t("tradieWeb.privacy.section2Item1")}</li>
              <li>{t("tradieWeb.privacy.section2Item2")}</li>
              <li>{t("tradieWeb.privacy.section2Item3")}</li>
              <li>{t("tradieWeb.privacy.section2Item4")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section3Title")}</h2>
            <p>{t("privacy.section3Intro")}</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>{t("privacy.section3Item1")}</li>
              <li>{t("privacy.section3Item3")}</li>
              <li>{t("privacy.section3Item4")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("tradieWeb.privacy.section4Title")}</h2>
            <p className="text-slate-600 leading-relaxed">{t("tradieWeb.privacy.section4Body")}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section5Title")}</h2>
            <p>{t("privacy.section5Intro")}</p>

            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-1 font-mono text-xs border border-slate-800">
              <p className="font-bold text-[#2563eb]">{t("tradieWeb.privacy.section5StealthTitle")}</p>
              <p className="text-xs text-slate-300 leading-relaxed">{t("tradieWeb.privacy.section5StealthBody")}</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section5EncryptionTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section5EncryptionBody")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section6Title")}</h2>
            <p>{t("privacy.section6Intro")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-[#1B2B4B] font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColProcessor")}</th>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColPurpose")}</th>
                    <th className="p-3 border-b border-slate-200 text-left">{t("privacy.section6ColLocation")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr><td className="p-3 font-semibold text-left">Neon DB</td><td className="p-3 text-left">{t("privacy.spNeonPurpose")}</td><td className="p-3 text-left">{t("privacy.spNeonLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Neon Auth &amp; Google OAuth</td><td className="p-3 text-left">{t("privacy.spNeonAuthPurpose")}</td><td className="p-3 text-left">{t("privacy.spNeonAuthLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Cloudflare Workers / OpenNext</td><td className="p-3 text-left">{t("privacy.spCloudflareWorkersPurpose")}</td><td className="p-3 text-left">{t("privacy.spCloudflareWorkersLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Cloudflare R2</td><td className="p-3 text-left">{t("privacy.spCloudflareR2Purpose")}</td><td className="p-3 text-left">{t("privacy.spCloudflareR2Location")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Stripe</td><td className="p-3 text-left">{t("privacy.spStripePurpose")}</td><td className="p-3 text-left">{t("privacy.spStripeLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Resend API</td><td className="p-3 text-left">{t("privacy.spResendPurpose")}</td><td className="p-3 text-left">{t("privacy.spResendLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Inngest Cloud</td><td className="p-3 text-left">{t("privacy.spInngestPurpose")}</td><td className="p-3 text-left">{t("privacy.spInngestLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">PostHog</td><td className="p-3 text-left">{t("privacy.spPostHogPurpose")}</td><td className="p-3 text-left">{t("privacy.spPostHogLocation")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">{"Google Analytics 4"}</td><td className="p-3 text-left">{t("privacy.spGa4Purpose")}</td><td className="p-3 text-left">{t("privacy.spGa4Location")}</td></tr>
                  <tr><td className="p-3 font-semibold text-left">Sentry</td><td className="p-3 text-left">{t("privacy.spSentryPurpose")}</td><td className="p-3 text-left">{t("privacy.spSentryLocation")}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section7Title")}</h2>
            <p>{t("privacy.section7Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section8Title")}</h2>
            <p>{t("privacy.section8Body")}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section9Title")}</h2>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9ExportTitle")}</h3>
              <p className="text-slate-600">{t("tradieWeb.privacy.section9ExportBody")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9DeletionTitle")}</h3>
              <p className="text-slate-600">{t("tradieWeb.privacy.section9DeletionBody")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-[#1B2B4B]">{t("privacy.section9RetentionTitle")}</h3>
              <p className="text-slate-600">{t("privacy.section9RetentionBody")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section10Title")}</h2>
            <p>{t("privacy.section10Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section11Title")}</h2>
            <p>{t("privacy.section11Body")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section12Title")}</h2>
            <p>{t("privacy.section12Body")}</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block font-mono text-xs text-[#2563eb] font-bold">
              {t("tradieWeb.privacy.section12Email")}
            </div>
            <p className="text-xs text-slate-500 mt-2">{t("privacy.section12OaicNote")}</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#1B2B4B]">{t("privacy.section13Title")}</h2>
            <p>{t("tradieWeb.privacy.section13Body")}</p>
          </div>
        </section>
      </div>
    </LegalDocumentLayout>
  );
}
