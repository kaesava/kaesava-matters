"use client";

import React, { useId } from "react";
import { t } from "@kaesava/i18n";
import type { TenantSwitcherProps } from "../ui-contracts.js";

export function TenantSwitcher({
  tenants,
  activeTenantId,
  onSwitchTenant,
}: TenantSwitcherProps) {
  const selectId = useId();
  if (tenants.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="sr-only">{t("settings.household.title")}</label>
      <select
        id={selectId}
        value={activeTenantId}
        onChange={(e) => onSwitchTenant(e.target.value)}
        className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {tenants.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </div>
  );
}
