/**
 * Generic Ring 1 Status Workflow Contracts & Transition Helpers
 */
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusMetadata {
  tone: StatusTone;
  labelKey: string;
}

export interface StatusWorkflowConfig<TStatus extends string> {
  statuses: Record<TStatus, StatusMetadata>;
  transitions: Record<TStatus, readonly TStatus[]>;
  initialStatus?: TStatus;
}

export function canTransition<TStatus extends string>(
  config: StatusWorkflowConfig<TStatus>,
  from: TStatus,
  to: TStatus,
): boolean {
  const allowed = config.transitions[from];
  return Array.isArray(allowed) ? allowed.includes(to) : false;
}

export function getNextStatuses<TStatus extends string>(
  config: StatusWorkflowConfig<TStatus>,
  current: TStatus,
): readonly TStatus[] {
  return config.transitions[current] ?? [];
}
