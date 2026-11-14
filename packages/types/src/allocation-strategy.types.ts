import { z } from "zod";

const AllocationStepTypeEnum = z.enum([
  "IMMEDIATE_BILLS",
  "DEFICIT_REPAIR",
  "BILLS_SAFETY_FLOOR",
  "PRO_RATA_BILLS",
  "EVERYDAY_ALLOWANCE",
  "PRIORITY_BILLS",
  "STANDARD_BILLS",
  "PRIORITY_GOALS",
  "STANDARD_GOALS",
  "FIXED_AMOUNT",
  "PERCENTAGE_SPLIT",
  "SURPLUS_SWEEP",
]);
export type AllocationStepType = z.infer<typeof AllocationStepTypeEnum>;

export type AllocationPresetKey =
  | "BALANCED"
  | "BILLS_FORTRESS"
  | "PAY_YOURSELF_FIRST"
  | "CUSTOM";

export const ApplyAllocationPresetCommand = z.object({
  presetKey: z.enum(["BALANCED", "BILLS_FORTRESS", "PAY_YOURSELF_FIRST"]),
  isPrivate: z.boolean().optional(),
}).strict();

export const UpdateAllocationStrategyStepsCommand = z.object({
  strategyId: z.string().uuid(),
  steps: z.array(
    z.object({
      id: z.string().uuid().optional(),
      orderIndex: z.number().int().min(0),
      stepType: AllocationStepTypeEnum,
      targetEnvelopeId: z.string().uuid().nullable().optional(),
      config: z.record(z.unknown()).nullable().optional(),
    }).strict()
  ),
}).strict();
