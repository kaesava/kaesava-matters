"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, FormLabel, Logo } from "@kaesava/ui/web";

export interface WebCompleteProfileCardProps {
  defaultName?: string;
  defaultHouseholdName?: string;
  householdLabel?: string;
  householdPlaceholder?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (data: { name: string; householdName: string }) => Promise<void> | void;
}

export function WebCompleteProfileCard({
  defaultName = "",
  defaultHouseholdName = "",
  householdLabel,
  householdPlaceholder,
  isSubmitting = false,
  error = null,
  onSubmit,
}: WebCompleteProfileCardProps) {
  const [name, setName] = useState(defaultName);
  const [householdName, setHouseholdName] = useState(defaultHouseholdName);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim()) {
      setLocalError(t("auth.fillAllFields"));
      return;
    }
    if (!householdName.trim()) {
      setLocalError(t("auth.householdNameRequired"));
      return;
    }
    await onSubmit({ name: name.trim(), householdName: householdName.trim() });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
      <div className="flex flex-col items-center text-center space-y-2">
        <Logo size="lg" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t("auth.completeProfileTitle")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("auth.completeProfileSubtitle")}
        </p>
      </div>
      <FormErrorBanner message={localError || error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel required>{t("auth.nameLabel")}</FormLabel>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.namePlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
          />
        </div>
        <div>
          <FormLabel required>{householdLabel || t("auth.householdNameLabel")}</FormLabel>
          <input
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder={householdPlaceholder || t("auth.householdNamePlaceholder")}
            className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
          {t("auth.completeProfileCta")}
        </Button>
      </form>
    </div>
  );
}
