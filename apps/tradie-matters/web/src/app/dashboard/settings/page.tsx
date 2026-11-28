"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Spinner, useToast } from "@kaesava/ui/web";
import {
  TenantDetailsSection,
  TenantMembersSection,
  UserProfileSettingsSection,
} from "@kaesava/capability-tenant/web";
import { trpc } from "../../../lib/trpc";
import { BusinessSettingsTab } from "./components/BusinessSettingsTab";
import { BillingSettingsTab } from "./components/BillingSettingsTab";
import { PrivacySettingsTab } from "./components/PrivacySettingsTab";
import "../../../i18n";

type TabKey = "business" | "profile" | "members" | "billing" | "privacy";

const TRADIE_ROLE_OPTIONS = [
  { key: "ADMIN", label: "Admin", baseRole: "MEMBER" as const },
  { key: "TRADIE", label: "Tradie", baseRole: "MEMBER" as const },
  { key: "BOOKKEEPER", label: "Bookkeeper", baseRole: "VIEWER" as const },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabKey>("business");

  const profileQuery = trpc.getUserProfile.useQuery();
  const prefQuery = trpc.getUserPreferences.useQuery();
  const tenantQuery = trpc.getTenantDetails.useQuery();
  const membersQuery = trpc.listTenantMembers.useQuery();

  const updateProfile = trpc.updateUserProfile.useMutation({
    onSuccess: () => {
      void utils.getUserProfile.invalidate();
      showToast({ type: "success", message: t("tradieWeb.settingsSaved") });
    },
  });
  const updateTenant = trpc.updateTenantDetails.useMutation({
    onSuccess: () => {
      void utils.getTenantDetails.invalidate();
      showToast({ type: "success", message: t("tradieWeb.settingsSaved") });
    },
  });
  const inviteMember = trpc.inviteMember.useMutation({ onSuccess: () => void utils.listTenantMembers.invalidate() });
  const removeMember = trpc.removeMember.useMutation({ onSuccess: () => void utils.listTenantMembers.invalidate() });

  if (profileQuery.isLoading || tenantQuery.isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "business", label: t("tradieWeb.settingsBusinessTab") },
    { key: "profile", label: t("tradieWeb.settingsProfileTab") },
    { key: "members", label: t("tradieWeb.settingsMembersTab") },
    { key: "billing", label: t("tradieWeb.settingsBillingTab") },
    { key: "privacy", label: t("tradieWeb.settingsPrivacyTab") },
  ];

  const members = membersQuery.data ?? [];
  const ownerCount = members.filter((m) => m.role === "OWNER").length;
  const isOwner = tenantQuery.data?.currentUserRole === "OWNER";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.navSettings")}</h1>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              tab === item.key ? "bg-[#2563eb] text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "business" && <BusinessSettingsTab />}
      {tab === "profile" && tenantQuery.data && (
        <div className="space-y-6">
          <UserProfileSettingsSection
            displayName={profileQuery.data?.displayName ?? ""}
            loginEmail={profileQuery.data?.email ?? ""}
            notificationEmail={prefQuery.data?.notificationEmail || profileQuery.data?.email || ""}
            phoneNumber={profileQuery.data?.phoneNumber ?? ""}
            isSaving={updateProfile.isPending}
            onSave={async (d) => { await updateProfile.mutateAsync(d); }}
          />
          <TenantDetailsSection
            tenantName={tenantQuery.data.name}
            country={tenantQuery.data.country}
            currency={tenantQuery.data.currency}
            timezone={tenantQuery.data.timezone}
            state={tenantQuery.data.state}
            postcode={tenantQuery.data.postcode}
            isOwner={isOwner}
            isSaving={updateTenant.isPending}
            onSave={async (d) => { await updateTenant.mutateAsync(d); }}
          />
        </div>
      )}
      {tab === "members" && (
        <TenantMembersSection
          members={members.map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.displayName || m.email,
            email: m.email,
            role: m.role,
            isOwner: m.role === "OWNER",
            isPending: false,
          }))}
          currentUserId={profileQuery.data?.id ?? ""}
          isOwner={isOwner}
          roleOptions={TRADIE_ROLE_OPTIONS}
          isInviting={inviteMember.isPending}
          onInvite={async (d) => { await inviteMember.mutateAsync({ email: d.email, role: d.role ?? "MEMBER", appRole: d.appRole ?? undefined }); }}
          onRemoveMember={async (memberId) => { await removeMember.mutateAsync({ memberId }); }}
        />
      )}
      {tab === "billing" && <BillingSettingsTab />}
      {tab === "privacy" && (
        <PrivacySettingsTab tenantName={tenantQuery.data?.name ?? ""} isOwner={isOwner} isSoleOwner={isOwner && ownerCount <= 1} />
      )}
    </div>
  );
}
