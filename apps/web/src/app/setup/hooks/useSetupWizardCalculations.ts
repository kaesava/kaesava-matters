"use client";

import { useMemo } from "react";
import {
  QuizAnswers,
  EstimatedCategoryItem,
  UserGoalItem,
  computeSetupWizardCalculations,
} from "@money-matters/types";

interface CalculationsProps {
  quizAnswers: QuizAnswers;
  isRerun: boolean;
  goals?: UserGoalItem[];
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
  billTypeOverrides?: Record<string, "RECURRING" | "TARGET_BALANCE">;
}

export function useSetupWizardCalculations({
  quizAnswers,
  isRerun,
  goals = [],
  customCategories,
  removedCategoryNames,
  amountOverrides,
  billTypeOverrides = {},
}: CalculationsProps) {
  return useMemo(
    () =>
      computeSetupWizardCalculations({
        quizAnswers,
        isRerun,
        goals,
        customCategories,
        removedCategoryNames,
        amountOverrides,
        billTypeOverrides,
      }),
    [
      quizAnswers,
      isRerun,
      goals,
      customCategories,
      removedCategoryNames,
      amountOverrides,
      billTypeOverrides,
    ]
  );
}
