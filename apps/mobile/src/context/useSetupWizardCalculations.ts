import { useMemo } from 'react';
import {
  IncomeItem,
  HousingType,
  VehicleConfig,
  ChildConfig,
  EstimatedCategoryItem,
  QuizAnswers,
  UserGoalItem,
  convertToMonthly,
  convertFromMonthly,
  computeSetupWizardCalculations as computeSharedSetupWizardCalculations,
} from '@money-matters/types';

export { convertToMonthly, convertFromMonthly };

export interface CalculationsProps {
  country: 'AU' | 'NZ' | 'OTHER';
  isRerun: boolean;
  incomes: IncomeItem[];
  housingType: HousingType;
  hasCars: boolean;
  vehicles: VehicleConfig[];
  usePublicTransport: boolean;
  useRideshare: boolean;
  hasKids: boolean;
  children: ChildConfig[];
  hasPrivateHealth: boolean;
  hasGym: boolean;
  hasMedicalOutofPocket: boolean;
  hasPets: boolean;
  petsCount: number;
  debtMonthlyRepayment: number;
  hasCharityGiving: boolean;
  charityMonthlyAmount: number;
  weeklyGroceries: number;
  weeklyDining: number;
  weeklyPersonal: number;
  goals?: UserGoalItem[];
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
  billTypeOverrides?: Record<string, 'RECURRING' | 'TARGET_BALANCE'>;
}

export function computeSetupWizardCalculations(props: CalculationsProps) {
  const quizAnswers: QuizAnswers = {
    country: props.country,
    incomes: props.incomes,
    housingType: props.housingType,
    hasCars: props.hasCars,
    vehicles: props.vehicles,
    usePublicTransport: props.usePublicTransport,
    useRideshare: props.useRideshare,
    hasKids: props.hasKids,
    children: props.children,
    hasPrivateHealth: props.hasPrivateHealth,
    hasGym: props.hasGym,
    hasMedicalOutofPocket: props.hasMedicalOutofPocket,
    hasPets: props.hasPets,
    petsCount: props.petsCount,
    activeDebtMonthlyRepayment: props.debtMonthlyRepayment,
    givesCharity: props.hasCharityGiving,
    familySupportMonthlyAmount: props.charityMonthlyAmount,
    weeklyGroceries: props.weeklyGroceries,
    weeklyDining: props.weeklyDining,
    weeklyPersonal: props.weeklyPersonal,
  };

  return computeSharedSetupWizardCalculations({
    quizAnswers,
    isRerun: props.isRerun,
    goals: props.goals,
    customCategories: props.customCategories,
    removedCategoryNames: props.removedCategoryNames,
    amountOverrides: props.amountOverrides,
    billTypeOverrides: props.billTypeOverrides,
  });
}

export function useSetupWizardCalculations(props: CalculationsProps) {
  return useMemo(() => computeSetupWizardCalculations(props), [
    props.country,
    props.isRerun,
    props.incomes,
    props.housingType,
    props.hasCars,
    props.vehicles,
    props.usePublicTransport,
    props.useRideshare,
    props.hasKids,
    props.children,
    props.hasPrivateHealth,
    props.hasGym,
    props.hasMedicalOutofPocket,
    props.hasPets,
    props.petsCount,
    props.debtMonthlyRepayment,
    props.hasCharityGiving,
    props.charityMonthlyAmount,
    props.weeklyGroceries,
    props.weeklyDining,
    props.weeklyPersonal,
    props.goals,
    props.customCategories,
    props.removedCategoryNames,
    props.amountOverrides,
    props.billTypeOverrides,
  ]);
}
