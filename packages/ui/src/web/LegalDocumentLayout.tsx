"use client";

import React from "react";

export interface LegalDocumentLayoutProps {
  title: string;
  lastUpdated: string;
  entityName: string;
  jurisdiction: string;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared statutory AU sole-trader / OAIC / ACL legal document layout for /privacy and /terms.
 */
export function LegalDocumentLayout({
  title,
  lastUpdated,
  entityName,
  jurisdiction,
  headerSlot,
  footerSlot,
  children,
}: LegalDocumentLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {headerSlot}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <header className="mb-8 border-b border-slate-200 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {lastUpdated} · {entityName} ({jurisdiction})
          </p>
        </header>
        <article className="prose prose-slate max-w-none dark:prose-invert">{children}</article>
      </main>
      {footerSlot}
    </div>
  );
}
