import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import React from "react";
import { DESIGN_TOKENS } from "@kaesava/ui/tokens";
import { AppProviders } from "../providers/AppProviders";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import "../i18n";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

const baseUrl = "https://tradiematters.kaesava.au";

export const viewport: Viewport = {
  themeColor: DESIGN_TOKENS.colors.sereneBlue,
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Tradie Matters — Job Management, Quoting & Invoicing for Australian Tradies",
    template: "%s | Tradie Matters",
  },
  description:
    "Unlimited quotes, live job costing, offline field app, two-way Xero/MYOB/QuickBooks sync, and no-surcharge PayID/PayTo invoicing for Australian trade crews — from $9.95/mo flat.",
  keywords: [
    "tradie job management software Australia",
    "tradie quoting app",
    "tradie invoicing software GST",
    "job costing for tradies",
    "Payday Super cashflow tradies",
    "offline field service app Australia",
    "Xero sync tradie software",
    "small crew trade software",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-AU": baseUrl,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/tradie-matters-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Tradie Matters — Unlimited Quotes, Live Job Costing & Fast Payments (AU)",
    description:
      "Flat-rate job management for Australian sole traders and 1–5 person crews. Unlimited quotes, offline field tools, live margins, Xero/MYOB/QBO sync, and PayID/PayTo invoicing.",
    url: baseUrl,
    siteName: "Tradie Matters",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tradie Matters — Job Management, Quoting & Invoicing for Australian Tradies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradie Matters — Flat-Rate Job Management for Australian Tradies",
    description:
      "Unlimited quotes, live job costing, offline field app, and no-surcharge PayID/PayTo invoicing for 1–5 person Australian trade crews.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} scroll-smooth`} suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
        <GoogleAnalytics />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
