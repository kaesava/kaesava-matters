import { z } from "zod";

export const VisitStatusEnum = z.enum(["SCHEDULED", "EN_ROUTE", "CHECKED_IN", "COMPLETED", "CANCELLED"]);

export const GetDispatchBoardInput = z
  .object({
    rangeStart: z.string().datetime(),
    rangeEnd: z.string().datetime(),
    assigneeUserId: z.string().uuid().optional(),
  })
  .strict();

export type GetDispatchBoardInputType = z.infer<typeof GetDispatchBoardInput>;

export const CreateVisitInput = z
  .object({
    jobId: z.string().uuid(),
    title: z.string().min(1).max(255),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    visitNotes: z.string().max(2000).nullable().optional(),
    assigneeUserIds: z.array(z.string().uuid()).default([]),
    leadUserId: z.string().uuid().optional(),
  })
  .strict();

export type CreateVisitInputType = z.infer<typeof CreateVisitInput>;

export const RescheduleVisitInput = z
  .object({
    visitId: z.string().uuid(),
    scheduledStart: z.string().datetime(),
    scheduledEnd: z.string().datetime(),
    assigneeUserIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export type RescheduleVisitInputType = z.infer<typeof RescheduleVisitInput>;

export const AssignVisitCrewInput = z
  .object({
    visitId: z.string().uuid(),
    assigneeUserIds: z.array(z.string().uuid()),
    leadUserId: z.string().uuid().optional(),
  })
  .strict();

export type AssignVisitCrewInputType = z.infer<typeof AssignVisitCrewInput>;
