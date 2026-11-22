import React from 'react';

export interface LegalDocumentSection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
}

export interface LegalDocumentPageProps {
  title: string;
  lastUpdated: string;
  subtitle?: string;
  sections: readonly LegalDocumentSection[];
  footerNote?: string;
}

export function LegalDocumentPage({
  title,
  lastUpdated,
  subtitle,
  sections,
  footerNote,
}: LegalDocumentPageProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-10 border-b border-slate-200 pb-6 dark:border-slate-800">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{subtitle}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{lastUpdated}</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              {section.heading}
            </h2>
            {section.paragraphs.map((text, idx) => (
              <p key={idx} className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {text}
              </p>
            ))}
          </section>
        ))}
      </div>

      {footerNote ? (
        <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {footerNote}
        </footer>
      ) : null}
    </main>
  );
}
