import Link from "next/link";
import { t } from "@kaesava/i18n";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-6">
      <span className="text-xs font-extrabold uppercase tracking-widest text-[#2563eb]">
        Tradie Matters
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-[#1B2B4B] max-w-xl">
        Tradie Matters
      </h1>
      <div className="flex items-center gap-4">
        <Link
          href="/sign-in"
          className="px-5 py-2.5 rounded-xl bg-[#2563eb] text-white text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          {t("auth.signIn")}
        </Link>
        <Link
          href="/sign-up"
          className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-[#1B2B4B] text-sm font-bold hover:bg-slate-50 transition-colors"
        >
          {t("landing.createAccount")}
        </Link>
      </div>
    </main>
  );
}
