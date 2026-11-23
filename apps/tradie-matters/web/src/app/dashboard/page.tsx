"use client";

import React, { useEffect, useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, Spinner } from "@kaesava/ui/web";

interface SessionUser {
  name?: string | null;
  email?: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [apiStatus, setApiStatus] = useState<string>("...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sessionRes, healthRes] = await Promise.all([
          fetch("/api/auth/get-session", { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3011"}/health`),
        ]);
        const sessionData = (await sessionRes.json().catch(() => null)) as { user?: SessionUser } | null;
        setUser(sessionData?.user ?? null);
        setApiStatus(healthRes.ok ? "OK" : String(healthRes.status));
      } catch {
        setApiStatus("ERR");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
    window.location.href = "/sign-in";
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563eb]">
            Tradie Matters
          </span>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("nav.home")}</h1>
        </div>
        <Button type="button" variant="secondary" onClick={handleSignOut}>
          {t("auth.signOut")}
        </Button>
      </header>
      <section className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-2">
        <p className="text-sm font-semibold text-[#1B2B4B]">{user?.name || user?.email || "-"}</p>
        <p className="text-xs text-slate-500">{user?.email || "-"}</p>
        <p className="text-xs font-mono text-emerald-700">{`API: ${apiStatus}`}</p>
      </section>
    </main>
  );
}
