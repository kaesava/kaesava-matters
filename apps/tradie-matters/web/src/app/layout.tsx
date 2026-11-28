import type { Metadata, Viewport } from "next";
import React from "react";
import { DESIGN_TOKENS } from "@kaesava/ui/tokens";
import { AppProviders } from "../providers/AppProviders";
import { GoogleAnalytics } from "../components/GoogleAnalytics";
import "../i18n";
import "./globals.css";

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
    default: "Tradie Matters — Quotes, Jobs & Payments (AU)",
    template: "%s | Tradie Matters",
  },
  description: "Simple quote, job, customer, and payment management for Australian tradies.",
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
    title: "Tradie Matters — Quotes • Jobs • Payments",
    description: "Simple quote, job, customer, and payment management for Australian tradies.",
    url: baseUrl,
    siteName: "Tradie Matters",
    locale: "en_AU",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tradie Matters — Quotes • Jobs • Payments",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tradie Matters — Quotes • Jobs • Payments",
    description: "Simple quote, job, customer, and payment management for Australian tradies.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F7F8FA] text-[#1B2B4B] antialiased font-sans">
        <GoogleAnalytics />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
