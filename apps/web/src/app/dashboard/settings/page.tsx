"use client";
import { DEFAULT_TIMEZONE } from "@money-matters/types";


import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { t } from "@money-matters/i18n";
import { ConfirmDialog, Button, useToast, PlatformSettingsShell } from "@money-matters/ui/web";
import { authClient } from "../../../lib/auth";
import posthog from "../../../lib/posthog-client";
import { trpc } from "../../../lib/trpc";
import { getWebVersionInfo } from "../../../lib/version";
import { FeedbackModal } from "../../../components/web/FeedbackModal";

import { useSubscriptionStatus } from "../../../hooks/useSubscriptionStatus";
import { ProfileSection } from "./components/ProfileSection";
import { SubscriptionSection } from "./components/SubscriptionSection";
import { HouseholdMemberInviteSection } from "./components/HouseholdMemberInviteSection";
import { HouseholdDetailsSection } from "./components/HouseholdDetailsSection";
import { HouseholdDangerZoneSection } from "./components/HouseholdDangerZoneSection";
import { AllocationStrategySection } from "./components/AllocationStrategySection";
import { ArchivedSection } from "./components/ArchivedSection";
import { PrivacySection } from "./components/PrivacySection";
import { useProductTour } from "../../../providers/ProductTourContext";

function SettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const { status } = useSubscriptionStatus();
  const currentTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(status?.isTrialExpired ? "account-data" : currentTab);

  const toast = useToast();
  const { startTour } = useProductTour();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isHouseholdDirty, setIsHouseholdDirty] = useState(false);
  const discardProfileRef = React.useRef<(() => void) | null>(null);
  const discardHouseholdRef = React.useRef<(() => void) | null>(null);

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const currentTimezone = userPrefQuery.data?.timezone || DEFAULT_TIMEZONE;

  React.useEffect(() => {
    if (status?.isTrialExpired) {
      if (activeTab !== "account-data") {
        setActiveTab("account-data");
      }
    } else if (currentTab !== activeTab && !isProfileDirty && !isHouseholdDirty) {
      setActiveTab(currentTab);
    }
  }, [status?.isTrialExpired, currentTab, activeTab, isProfileDirty, isHouseholdDirty]);

  const handleTabChange = (tabId: string) => {
    if (status?.isTrialExpired && tabId !== "account-data") {
      return;
    }
    if (tabId === activeTab) return;

    if (activeTab === "profile" && isProfileDirty) {
      setPendingTab(tabId);
      setShowDiscardConfirm(true);
      return;
    }

    if (activeTab === "household" && isHouseholdDirty) {
      setPendingTab(tabId);
      setShowDiscardConfirm(true);
      return;
    }

    setActiveTab(tabId);
    window.history.replaceState(null, "", `/dashboard/settings?tab=${tabId}`);
  };

  const handleConfirmDiscard = () => {
    if (activeTab === "profile" && discardProfileRef.current) {
      discardProfileRef.current();
    } else if (activeTab === "household" && discardHouseholdRef.current) {
      discardHouseholdRef.current();
    }
    setShowDiscardConfirm(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      window.history.replaceState(null, "", `/dashboard/settings?tab=${pendingTab}`);
      setPendingTab(null);
    }
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    posthog.reset();
    router.push("/sign-in");
  };

  const versionInfo = getWebVersionInfo();

  const handleCopyDiagnostics = () => {
    navigator.clipboard.writeText(JSON.stringify(versionInfo, null, 2));
    toast.success(t("toasts.copied"));
  };

  const tabsList = [
    {
      id: "profile",
      label: t("settings.tabs.profile"),
      content: (
        <>
          <ProfileSection
            user={session?.user}
            currentTimezone={currentTimezone}
            onDirtyChange={setIsProfileDirty}
            registerDiscard={(fn) => {
              discardProfileRef.current = fn;
            }}
          />
          <div className="bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
                <span>{t("settings.notifications.title")}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                {t("settings.notifications.subtitle")}
              </p>
            </div>
            <Link href="/dashboard/settings/notifications" className="shrink-0 self-start sm:self-center">
              <Button variant="secondary" className="text-xs h-9 cursor-pointer">
                {t("settings.notifications.title")}
              </Button>
            </Link>
          </div>
        </>
      ),
    },
    {
      id: "household",
      label: t("settings.tabs.household"),
      content: (
        <>
          <HouseholdDetailsSection
            onDirtyChange={setIsHouseholdDirty}
            registerDiscard={(fn) => {
              discardHouseholdRef.current = fn;
            }}
          />
          <AllocationStrategySection />
          <div className="bg-white/75 dark:bg-zinc-900/75 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-zinc-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#1B2B4B] dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#2563eb]" />
                <span>{t("setup.recalibrateTitle")}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                {t("setup.recalibrateSubtitle")}
              </p>
            </div>
            <Link href="/setup?mode=rerun" className="shrink-0 self-start sm:self-center">
              <Button variant="secondary" className="text-xs h-9 cursor-pointer">
                {t("setup.recalibrateTitle")}
              </Button>
            </Link>
          </div>
          <HouseholdMemberInviteSection />
          <HouseholdDangerZoneSection />
        </>
      ),
    },
    {
      id: "archived",
      label: t("settings.tabs.archived"),
      content: <ArchivedSection />,
    },
    {
      id: "account-data",
      label: t("settings.tabs.accountData"),
      content: (
        <>
          <SubscriptionSection status={status} />
          <PrivacySection />
        </>
      ),
    },
  ];

  return (
    <PlatformSettingsShell
      title={t("settings.title")}
      headerAction={
        <button
          type="button"
          onClick={handleSignOut}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs"
        >
          {t("settings.signOut")}
        </button>
      }
      tabs={tabsList}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      footer={
        <>
          {/* Feedback & Version Section */}
          <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startTour}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 transition-all shadow-xs cursor-pointer"
              >
                <span>✨</span>
                <span>{t("tour.settings.revisitTour")}</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedbackVisible(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-400 transition-all shadow-xs cursor-pointer"
              >
                {t("settings.reportBugLink")}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 transition-colors"
              title={t("settings.versionInfo.copyDiagnosticsHint")}
            >
              Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
            </button>
          </div>

          <FeedbackModal
            isOpen={feedbackVisible}
            onClose={() => setFeedbackVisible(false)}
            userEmail={session?.user?.email || ""}
          />

          <ConfirmDialog
            isOpen={showDiscardConfirm}
            title={t("modals.discardChanges.title")}
            description={t("modals.discardChanges.description")}
            confirmLabel={t("modals.discardChanges.discard")}
            cancelLabel={t("common.keepEditing")}
            variant="danger"
            onConfirm={handleConfirmDiscard}
            onClose={() => {
              setShowDiscardConfirm(false);
              setPendingTab(null);
            }}
          />
        </>
      }
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">{t("settings.loadingSettings")}</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
