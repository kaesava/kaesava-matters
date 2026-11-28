import { z } from "zod";

export const JobStatusEnum = z.enum([
  "LEAD",
  "QUOTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "INVOICED",
  "CANCELLED",
]);

export const JobPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal").nullable().optional();

export const CreateJobInput = z
  .object({
    jobNumber: z.string().min(1).max(40).optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(4000).nullable().optional(),
    status: JobStatusEnum.default("LEAD"),
    priority: JobPriorityEnum.default("NORMAL"),
    customerId: z.string().uuid(),
    siteId: z.string().uuid().nullable().optional(),
    leadTradieUserId: z.string().uuid().nullable().optional(),
    scheduledStart: z.string().datetime().nullable().optional(),
    scheduledEnd: z.string().datetime().nullable().optional(),
    estimatedHours: decimalString,
    quotedAmountExTax: decimalString,
    hasUnbilledExtras: z.boolean().optional(),
    purchaseOrderNumber: z.string().max(80).nullable().optional(),
    internalNotes: z.string().max(4000).nullable().optional(),
  })
  .strict();

export type CreateJobInputType = z.infer<typeof CreateJobInput>;

export const UpdateJobInput = CreateJobInput.partial()
  .extend({
    id: z.string().uuid(),
    completedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export type UpdateJobInputType = z.infer<typeof UpdateJobInput>;

export const TransitionJobStatusInput = z
  .object({
    id: z.string().uuid(),
    status: JobStatusEnum,
  })
  .strict();

export const ListJobsInput = z
  .object({
    status: JobStatusEnum.optional(),
    customerId: z.string().uuid().optional(),
    search: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .strict();
