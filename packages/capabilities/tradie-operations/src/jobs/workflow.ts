import { canTransition, type StatusWorkflowConfig } from "@kaesava/types/platform";

export type JobStatus =
  | "LEAD"
  | "QUOTED"
  | "APPROVED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "INVOICED"
  | "PAID"
  | "CANCELLED";

export const JOB_STATUS_WORKFLOW: StatusWorkflowConfig<JobStatus> = {
  initialStatus: "LEAD",
  statuses: {
    LEAD: { tone: "neutral", labelKey: "tradieJobs.statusLead" },
    QUOTED: { tone: "info", labelKey: "tradieJobs.statusQuoted" },
    APPROVED: { tone: "info", labelKey: "tradieJobs.statusApproved" },
    SCHEDULED: { tone: "info", labelKey: "tradieJobs.statusScheduled" },
    IN_PROGRESS: { tone: "warning", labelKey: "tradieJobs.statusInProgress" },
    ON_HOLD: { tone: "warning", labelKey: "tradieJobs.statusOnHold" },
    COMPLETED: { tone: "success", labelKey: "tradieJobs.statusCompleted" },
    INVOICED: { tone: "success", labelKey: "tradieJobs.statusInvoiced" },
    PAID: { tone: "success", labelKey: "tradieJobs.statusPaid" },
    CANCELLED: { tone: "danger", labelKey: "tradieJobs.statusCancelled" },
  },
  transitions: {
    LEAD: ["QUOTED", "SCHEDULED", "IN_PROGRESS", "CANCELLED"],
    QUOTED: ["APPROVED", "SCHEDULED", "IN_PROGRESS", "ON_HOLD", "CANCELLED"],
    APPROVED: ["SCHEDULED", "IN_PROGRESS", "ON_HOLD", "CANCELLED"],
    SCHEDULED: ["IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"],
    IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
    ON_HOLD: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
    COMPLETED: ["INVOICED", "IN_PROGRESS"],
    INVOICED: ["PAID"],
    PAID: [],
    CANCELLED: ["LEAD"],
  },
};

export function assertJobTransition(from: JobStatus, to: JobStatus): void {
  if (from === to) return;
  if (!canTransition(JOB_STATUS_WORKFLOW, from, to)) {
    throw new Error(`Invalid job status transition from ${from} to ${to}.`);
  }
}
