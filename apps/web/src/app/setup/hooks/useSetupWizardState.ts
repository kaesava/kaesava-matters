"use client";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@money-matters/types";


import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import {
  QuizAnswers,
  EstimatedCategoryItem,
} from "@money-matters/types";
import { useSetupWizardCalculations } from "./useSetupWizardCalculations";
import { useSetupWizardPrepopulation } from "./useSetupWizardPrepopulation";
import { useSetupWizardSubmission } from "./useSetupWizardSubmission";
import { useSetupLifestyleState } from "./useSetupLifestyleState";
import { useSetupBankAccountsState } from "./useSetupBankAccountsState";
import { useSetupIncomeState } from "./useSetupIncomeState";
import { useSetupGoalsState } from "./useSetupGoalsState";

export function useSetupWizardState() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });
  const createTenantMut = trpc.createTenant.useMutation();
  const hasTenant = tenantStatusQuery.data?.hasTenant === true;
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });
  const tenantQuery = trpc.getTenant.useQuery(undefined, {
    enabled: !!session?.user && hasTenant,
  });
  const cancelSetupMut = trpc.cancelSetup.useMutation();

  // Redirect authenticated users without a household to /complete-profile to confirm country & terms
  useEffect(() => {
    if (tenantStatusQuery.data && !tenantStatusQuery.data.hasTenant) {
      router.replace("/complete-profile");
    }
  }, [tenantStatusQuery.data, router]);

  const [step, setStep] = useState(1);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const isExitingRef = useRef(false);
  const toast = useToast();

  // Re-run mode & strict pre-load redirect guard:
  // COMPLETED or CANCELLED => must use /setup?mode=rerun; otherwise => must use /setup
  const isRerunParam = searchParams?.get("mode") === "rerun";
  const setupStatus = userPrefQuery.data?.setupStatus;
  const setupDone = setupStatus === "COMPLETED" || setupStatus === "CANCELLED";
  const isRouteChecking =
    !session?.user ||
    tenantStatusQuery.isLoading ||
    (hasTenant && userPrefQuery.isLoading) ||
    (!isExitingRef.current &&
      hasTenant &&
      userPrefQuery.data !== undefined &&
      ((setupDone && !isRerunParam) || (!setupDone && isRerunParam)));
  const isRerun = isRerunParam && setupDone;

  useEffect(() => {
    if (isExitingRef.current || !hasTenant || userPrefQuery.data === undefined) return;
    if (setupDone && !isRerunParam) {
      router.replace("/setup?mode=rerun");
    } else if (!setupDone && isRerunParam) {
      router.replace("/setup");
    }
  }, [hasTenant, userPrefQuery.data, setupDone, isRerunParam, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDiscardModal(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const lifestyle = useSetupLifestyleState();
  const { setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal } = lifestyle;

  const accounts = useSetupBankAccountsState();
  const { bankAccounts, setBankAccounts, archivedAccountIds } = accounts;

  const [customCategories, setCustomCategories] = useState<EstimatedCategoryItem[]>([]);
  const [removedCategoryNames, setRemovedCategoryNames] = useState<Set<string>>(new Set());
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});
  const [billTypeOverrides, setBillTypeOverrides] = useState<Record<string, "RECURRING" | "TARGET_BALANCE">>({});
  const [categoryFrequencies, setCategoryFrequencies] = useState<Record<string, "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY">>({});

  const incomeState = useSetupIncomeState({
    onProceedToNextStep: () => setStep(2),
  });

  const goalsState = useSetupGoalsState({
    onProceedToNextStep: () => setStep(isRerun ? 3 : 4),
  });

  const { incomes, setIncomes } = incomeState;
  const { goals, setGoals } = goalsState;

  // Prepopulation query
  const prepopulation = useSetupWizardPrepopulation({
    isRerun,
    enabled: !!session?.user && hasTenant,
    setIncomes,
    setBankAccounts,
    setGoals,
    setCustomCategories,
    setCategoryFrequencies,
  });

  const isAud = tenantQuery.data?.currency ? tenantQuery.data.currency === "AUD" : true;

  useEffect(() => {
    const tenantCountry = tenantQuery.data?.country;
    if (tenantCountry) {
      const normalizedCountry: "AU" | "NZ" | "OTHER" =
        tenantCountry === "AU" || tenantCountry === "NZ" ? tenantCountry : "OTHER";
      setCountry(normalizedCountry);
      if (normalizedCountry !== "AU") {
        setWeeklyGroceries(0);
        setWeeklyDining(0);
        setWeeklyPersonal(0);
      }
    }
    const tenantCurrency = tenantQuery.data?.currency;
    if (tenantCurrency && tenantCurrency !== "AUD" && !isRerun) {
      setIncomes((prev) =>
        prev.map((inc) => (inc.id === "inc-1" && inc.amount === 3200 ? { ...inc, amount: 0 } : inc))
      );
      setBankAccounts((prev) =>
        prev.map((acc) => (acc.id === "acc-default" && acc.lastKnownBalance === "1000.00" ? { ...acc, lastKnownBalance: "0.00" } : acc))
      );
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === "g-1" && g.targetAmount === 10000) {
            return { ...g, monthlyAmount: 0, targetAmount: 0, enteredAmount: 0 };
          }
          if (g.id === "g-2" && g.targetAmount === 3000) {
            return { ...g, monthlyAmount: 0, targetAmount: 0 };
          }
          return g;
        })
      );
      setWeeklyGroceries(0);
      setWeeklyDining(0);
      setWeeklyPersonal(0);
    }
  }, [tenantQuery.data?.country, tenantQuery.data?.currency, isRerun, setCountry, setWeeklyGroceries, setWeeklyDining, setWeeklyPersonal, setBankAccounts, setIncomes, setGoals]);

  const quizAnswers: QuizAnswers = useMemo(
    () => ({
      country: lifestyle.country,
      incomes,
      housingType: lifestyle.housingType,
      hasCars: lifestyle.hasCars,
      vehicles: lifestyle.vehicles,
      usePublicTransport: lifestyle.usePublicTransport,
      useRideshare: lifestyle.useRideshare,
      hasKids: lifestyle.hasKids,
      children: lifestyle.children,
      hasPrivateHealth: lifestyle.hasPrivateHealth,
      hasGym: lifestyle.hasGym,
      hasMedicalOutofPocket: lifestyle.hasMedicalOutofPocket,
      hasPets: lifestyle.hasPets,
      petsCount: lifestyle.petsCount,
      activeDebtMonthlyRepayment: lifestyle.debtMonthlyRepayment,
      givesCharity: lifestyle.hasCharityGiving,
      familySupportMonthlyAmount: lifestyle.charityMonthlyAmount,
      weeklyGroceries: lifestyle.weeklyGroceries,
      weeklyDining: lifestyle.weeklyDining,
      weeklyPersonal: lifestyle.weeklyPersonal,
    }),
    [lifestyle, incomes]
  );

  // Clear Step 5 manual Everyday override whenever Step 4 everyday sliders change
  useEffect(() => {
    if (!isRerun) {
      setAmountOverrides((prev) => {
        if (prev["Everyday Spending"] === undefined) return prev;
        const next = { ...prev };
        delete next["Everyday Spending"];
        return next;
      });
    }
  }, [isRerun, lifestyle.weeklyGroceries, lifestyle.weeklyDining, lifestyle.weeklyPersonal]);

  const calculations = useSetupWizardCalculations({
    quizAnswers,
    isRerun,
    goals,
    customCategories,
    removedCategoryNames,
    amountOverrides,
    billTypeOverrides,
  });

  const submission = useSetupWizardSubmission({
    isRerun,
    incomes,
    bankAccounts,
    activeCategories: calculations.activeCategories,
    goals,
    categoryFrequencies,
    removedCategoryNames,
    archivedGoalIds: goalsState.archivedGoalIds,
    archivedAccountIds,
    archivedIncomeIds: incomeState.archivedIncomeIds,
    existingPools: prepopulation.pools,
    onBeforeExit: () => {
      isExitingRef.current = true;
    },
  });

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      if (!isRerun) {
        if (!tenantStatusQuery.data?.hasTenant) {
          await createTenantMut.mutateAsync({
            name: "My Household",
            country: "AU",
            currency: DEFAULT_CURRENCY,
            timezone: DEFAULT_TIMEZONE,
          });
        }
        await cancelSetupMut.mutateAsync();
      }
      // Prevent the setup-route guard useEffect from redirecting back to /setup?mode=rerun mid-transition
      isExitingRef.current = true;
      utils.getTenantStatus.setData(undefined, (old) =>
        old ? { ...old, setupCompleted: true, setupStatus: isRerun ? old.setupStatus : "CANCELLED" } : undefined
      );
      utils.getUserPreferences.setData(undefined, (old) =>
        old ? { ...old, setupCompleted: true, setupStatus: isRerun ? old.setupStatus : "CANCELLED" } : undefined
      );
      setShowDiscardModal(false);
      router.replace("/dashboard");
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/setup")) {
          // Hard fallback if client router navigation stalls leaving /setup
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/dashboard");
        }
      }, 150);
    } catch (err: unknown) {
      isExitingRef.current = false;
      toast.error(err instanceof Error ? err.message : t("setup.saveError"));
    } finally {
      setIsDiscarding(false);
    }
  };

  return {
    router,
    isRerun,
    isRouteChecking,
    isLoading: prepopulation.isLoading,
    step,
    setStep,
    isSubmitting: submission.isSubmitting,
    isDiscarding,
    showDiscardModal,
    setShowDiscardModal,
    goals,
    setGoals: goalsState.setGoals,
    handleUpdateGoal: goalsState.handleUpdateGoalField,
    handleRemoveGoal: goalsState.handleRemoveGoal,
    handleNextFromGoals: goalsState.handleNextFromGoals,
    availablePools: prepopulation.pools,
    incomes,
    setIncomes: incomeState.setIncomes,
    dirtyIncomeIds: incomeState.dirtyIncomeIds,
    handleUpdateIncome: incomeState.handleUpdateIncomeField,
    handleRemoveIncome: incomeState.handleRemoveIncome,
    handleNextFromIncomes: incomeState.handleNextFromIncomes,
    bankAccounts,
    setBankAccounts,
    handleAddAccount: accounts.handleAddAccount,
    handleUpdateAccount: accounts.handleUpdateAccount,
    handleRemoveAccount: accounts.handleRemoveAccount,
    customCategories,
    setCustomCategories,
    removedCategoryNames,
    setRemovedCategoryNames,
    amountOverrides,
    setAmountOverrides,
    billTypeOverrides,
    setBillTypeOverrides,
    categoryFrequencies,
    setCategoryFrequencies,
    showIcons: userPrefQuery.data?.showIcons ?? true,
    ...lifestyle,
    ...calculations,
    isAud,
    handleFinish: submission.handleFinish,
    handleDiscard,
  };
}
