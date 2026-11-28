"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { PlatformSettingsShell, Spinner, useToast } from "@kaesava/ui/web";
import { NotificationPreferencesView } from "@kaesava/capability-notifications/web";
import {
  ArchivedItemsSection,
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
      void utils.getUserPreferences.invalidate();
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

  const members = membersQuery.data ?? [];
  const ownerCount = members.filter((m) => m.role === "OWNER").length;
  const isOwner = tenantQuery.data?.currentUserRole === "OWNER";

  const shellTabs = [
    { id: "business", label: t("tradieWeb.settingsBusinessTab"), content: <BusinessSettingsTab /> },
    {
      id: "profile",
      label: t("tradieWeb.settingsProfileTab"),
      content: tenantQuery.data ? (
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
      ) : null,
    },
    {
      id: "members",
      label: t("tradieWeb.settingsMembersTab"),
      content: (
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
      ),
    },
    { id: "billing", label: t("tradieWeb.settingsBillingTab"), content: <BillingSettingsTab /> },
    {
      id: "notifications",
      label: t("notifications.title"),
      content: (
        <NotificationPreferencesView
          topics={[]}
          onToggleTopic={async () => {}}
        />
      ),
    },
    {
      id: "archived",
      label: t("settings.archivedItems"),
      content: (
        <ArchivedItemsSection
          items={[]}
          onRestore={async () => {}}
        />
      ),
    },
    {
      id: "privacy",
      label: t("tradieWeb.settingsPrivacyTab"),
      content: <PrivacySettingsTab tenantName={tenantQuery.data?.name ?? ""} isOwner={isOwner} isSoleOwner={isOwner && ownerCount <= 1} />,
    },
  ];

  return (
    <PlatformSettingsShell
      title={t("tradieWeb.navSettings")}
      tabs={shellTabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabKey)}
    />
  );
}
