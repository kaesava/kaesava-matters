import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradie Matters",
  description: "Simple job, customer, and invoice management for tradies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#F7F8FA] text-[#1B2B4B] antialiased font-sans">{children}</body>
    </html>
  );
}
