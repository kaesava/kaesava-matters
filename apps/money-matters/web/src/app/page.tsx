import type { Metadata } from "next";
import { LandingPageClient } from "../components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Money Matters — Payday Cashflow & Bill Protection (AU)",
  description:
    "Ring-fence upcoming bills on payday, fund long-term goals, and spend freely with zero daily receipt tracking. 60-day free trial, no card required.",
  alternates: {
    canonical: "https://moneymatters.kaesava.au",
  },
};

export default function Home() {
  return <LandingPageClient />;
}
