"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { DataPrivacyAndExportSection, TenantDangerZoneSection } from "@kaesava/capability-tenant/web";
import { trpc } from "../../../../lib/trpc";
import { ANALYTICS_CONSENT_KEY } from "../../../../components/GoogleAnalytics";

interface Props {
  tenantName: string;
  isOwner: boolean;
  isSoleOwner: boolean;
}

export function PrivacySettingsTab({ tenantName, isOwner, isSoleOwner }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const prefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefs = trpc.updateUserPreferences.useMutation({
    onSuccess: () => void utils.getUserPreferences.invalidate(),
  });
  const leaveTenant = trpc.leaveTenant.useMutation({ onSuccess: () => router.push("/complete-profile") });
  const deleteTenant = trpc.deleteTenant.useMutation({ onSuccess: () => router.push("/complete-profile") });
  const [isExporting, setIsExporting] = useState(false);

  const handleToggleTelemetry = async (granted: boolean) => {
    const value = granted ? "granted" : "denied";
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
      window.dispatchEvent(new Event("mm-analytics-consent-changed"));
    } catch {
      // Ignore storage error
    }
    updatePrefs.mutate({ telemetryConsent: value });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await utils.exportTenantData.fetch();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tradie-matters-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DataPrivacyAndExportSection
        telemetryConsent={prefQuery.data?.telemetryConsent === "granted" ? "granted" : "denied"}
        isExporting={isExporting}
        onToggleTelemetry={handleToggleTelemetry}
        onExportData={handleExport}
        onOpenPrivacyPolicy={() => router.push("/privacy")}
        onOpenTerms={() => router.push("/terms")}
      />
      <TenantDangerZoneSection
        tenantName={tenantName}
        isOwner={isOwner}
        isSoleOwner={isSoleOwner}
        isSubmitting={leaveTenant.isPending || deleteTenant.isPending}
        onLeave={async () => { await leaveTenant.mutateAsync(); }}
        onDelete={async () => { await deleteTenant.mutateAsync(); }}
      />
    </div>
  );
}
