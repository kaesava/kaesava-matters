import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";


export const ACCOUNT_TYPES = [
  "EVERYDAY",
  "SAVINGS",
  "LOAN_OFFSET",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type BankProvider = string;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  EVERYDAY: "Everyday",
  SAVINGS: "Savings",
  LOAN_OFFSET: "Loan Offset",
};

const moneyRegex = /^\d{1,12}(\.\d{1,2})?$/;

export const BankAccountFormSchema = z
  .object({
    name: z.string().trim().min(1, "Bank account name is required").max(100, "Bank account name cannot exceed 100 characters"),
    bankProvider: z
      .string()
      .trim()
      .max(50, "Bank institution cannot exceed 50 characters")
      .optional()
      .transform((val) => (val && val.length > 0 ? val : "Other")),
    accountType: z.enum(ACCOUNT_TYPES).default("EVERYDAY"),
    currentBalance: z
      .string()
      .trim()
      .regex(moneyRegex, "Balance must be a valid non-negative amount"),
    unbudgetedBuffer: z
      .string()
      .trim()
      .regex(moneyRegex, "Buffer must be a valid non-negative amount")
      .default("0.00"),
    isPrivate: z.boolean().default(false),
  })
  .strict()
  .refine(
    (data) => {
      const bal = parseFloat(data.currentBalance || "0");
      const buf = parseFloat(data.unbudgetedBuffer || "0");
      return buf <= bal;
    },
    {
      message: "Safety cushion cannot exceed current balance",
      path: ["unbudgetedBuffer"],
    }
  );

export type BankAccountFormData = z.infer<typeof BankAccountFormSchema>;

export function computeAccountAvailability(
  currentBalanceStr: string | number | null | undefined,
  unbudgetedBufferStr: string | number | null | undefined
): {
  actualBalance: number;
  buffer: number;
  available: number;
} {
  const actualBalance = typeof currentBalanceStr === "number"
    ? currentBalanceStr
    : parseFloat(currentBalanceStr || "0") || 0;
  const buffer = typeof unbudgetedBufferStr === "number"
    ? unbudgetedBufferStr
    : parseFloat(unbudgetedBufferStr || "0") || 0;
  const available = Math.max(0, Math.round((actualBalance - buffer) * 100) / 100);

  return {
    actualBalance,
    buffer,
    available,
  };
}

/**
 * Schema validating financial bank account tracking entities within a tenant partition.
 */
export const BankAccountSchema = BaseSchema.extend({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  bankProvider: z.string().default("Other"),
  lastKnownBalance: z.string().default("0.00"),
  unbudgetedBuffer: z.string().default("0.00"),
  isPrivate: z.boolean().default(false),
  userId: z.string().uuid().nullable().optional(),
}).strict();

export type BankAccountType = z.infer<typeof BankAccountSchema>;

