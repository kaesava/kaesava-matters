"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, FormFieldError, FormLabel, Logo, Spinner } from "@kaesava/ui/web";
import {
  CompleteProfileInputSchema,
  DEFAULT_TIMEZONE,
  SUPPORTED_COUNTRIES,
  detectBestGuessCountry,
  getCountryDefaults,
} from "@kaesava/types";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/setup";
  const redirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && rawRedirect !== "/dashboard"
      ? rawRedirect
      : "/setup";

  const { data: session, isPending } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
  });
  const createTenant = trpc.createTenant.useMutation();

  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch {
      return DEFAULT_TIMEZONE;
    }
  }, []);

  const detectedCountry = useMemo(() => {
    try {
      const browserLocale =
        typeof navigator !== "undefined" ? navigator.languages?.[0] || navigator.language || "" : "";
      return detectBestGuessCountry(browserLocale, detectedTimezone);
    } catch {
      return "AU";
    }
  }, [detectedTimezone]);

  const [name, setName] = useState("");
  const [country, setCountry] = useState(() => detectedCountry);
  const [currency, setCurrency] = useState(() => getCountryDefaults(detectedCountry).currency);
  const [timezone, setTimezone] = useState(() => detectedTimezone);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; agreedToTerms?: string }>({});

  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session?.user?.name, name]);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
      return;
    }
    if (tenantStatusQuery.data?.hasTenant) {
      window.location.href = tenantStatusQuery.data.setupCompleted ? "/dashboard" : "/setup";
    }
  }, [isPending, session?.user, tenantStatusQuery.data, router]);

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const defaults = getCountryDefaults(newCountry);
    setCurrency(defaults.currency);
    setTimezone(defaults.timezone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validation = CompleteProfileInputSchema.safeParse({
      name: name.trim(),
      country,
      agreedToTerms,
    });

    if (!validation.success) {
      const nextErrors: { name?: string; agreedToTerms?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "name") nextErrors.name = t("auth.fillAllFields");
        if (issue.path[0] === "agreedToTerms") nextErrors.agreedToTerms = t("auth.mustAgreeToTerms");
      }
      setFieldErrors(nextErrors);
      setFormError(nextErrors.agreedToTerms || nextErrors.name || t("auth.fillAllFields"));
      return;
    }

    setSubmitting(true);
    try {
      await createTenant.mutateAsync({
        name: `${name.trim()}'s Household`,
        displayName: name.trim(),
        country,
        currency,
        timezone,
      });
      try {
        await authClient.updateUser({ name: name.trim() });
      } catch {
        // Non-blocking: backend users.displayName is already updated
      }
      window.location.href = redirectUrl;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("auth.unexpectedError"));
      setSubmitting(false);
    }
  };

  if (isPending || (session?.user && tenantStatusQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Spinner size="lg" className="text-[#2563eb]" />
      </div>
    );
  }

  const isFormValid = name.trim().length >= 2 && country.length === 2 && agreedToTerms;

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      <PublicHeader showSignIn={false} />
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <Logo size="lg" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("auth.completeProfileTitle")}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {t("auth.completeProfileSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            {formError && <FormErrorBanner message={formError} />}

            <div>
              <FormLabel required={true} htmlFor="complete-profile-name">
                {t("auth.nameLabel")}
              </FormLabel>
              <input
                id="complete-profile-name"
                type="text"
                autoFocus={true}
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder={t("auth.namePlaceholder")}
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              <FormFieldError error={fieldErrors.name} />
            </div>

            <div>
              <FormLabel required={true} htmlFor="complete-profile-country">
                {t("auth.countryLabel")}
              </FormLabel>
              <select
                id="complete-profile-country"
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white text-slate-900"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-start gap-2.5">
                <input
                  id="complete-profile-terms"
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => {
                    setAgreedToTerms(e.target.checked);
                    if (fieldErrors.agreedToTerms) {
                      setFieldErrors((prev) => ({ ...prev, agreedToTerms: undefined }));
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-[#2563eb] border-slate-300 focus:ring-[#2563eb]"
                />
                <label htmlFor="complete-profile-terms" className="text-[11px] text-slate-600 leading-snug">
                  {t("auth.agreeTermsPrefix")}{" "}
                  <Link href="/terms" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
                    {t("landing.footerTerms")}
                  </Link>{" "}
                  {t("auth.agreeTermsAnd")}{" "}
                  <Link href="/privacy" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
                    {t("landing.footerPrivacy")}
                  </Link>
                </label>
              </div>
              <FormFieldError error={fieldErrors.agreedToTerms} />
            </div>

            <Button
              type="submit"
              loading={submitting}
              disabled={!isFormValid || submitting}
              className="w-full mt-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {t("auth.completeProfileCta")}
            </Button>
          </form>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
          <Spinner size="lg" className="text-[#2563eb]" />
        </div>
      }
    >
      <CompleteProfileContent />
    </Suspense>
  );
}
