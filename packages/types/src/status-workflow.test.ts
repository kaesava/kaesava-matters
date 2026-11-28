import { describe, expect, it } from "vitest";
import {
  canTransition,
  getNextStatuses,
  type StatusWorkflowConfig,
} from "./status-workflow.js";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const TICKET_WORKFLOW: StatusWorkflowConfig<TicketStatus> = {
  initialStatus: "OPEN",
  statuses: {
    OPEN: { tone: "info", labelKey: "ticket.status.open" },
    IN_PROGRESS: { tone: "warning", labelKey: "ticket.status.inProgress" },
    RESOLVED: { tone: "success", labelKey: "ticket.status.resolved" },
    CLOSED: { tone: "neutral", labelKey: "ticket.status.closed" },
  },
  transitions: {
    OPEN: ["IN_PROGRESS", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "OPEN"],
    RESOLVED: ["CLOSED", "IN_PROGRESS"],
    CLOSED: [],
  },
};

describe("status-workflow", () => {
  it("allows declared transitions and rejects undeclared or terminal transitions", () => {
    expect(canTransition(TICKET_WORKFLOW, "OPEN", "IN_PROGRESS")).toBe(true);
    expect(canTransition(TICKET_WORKFLOW, "OPEN", "CLOSED")).toBe(true);
    expect(canTransition(TICKET_WORKFLOW, "IN_PROGRESS", "OPEN")).toBe(true);

    expect(canTransition(TICKET_WORKFLOW, "OPEN", "RESOLVED")).toBe(false);
    expect(canTransition(TICKET_WORKFLOW, "OPEN", "OPEN")).toBe(false);
    expect(canTransition(TICKET_WORKFLOW, "CLOSED", "OPEN")).toBe(false);
  });

  it("returns next allowed statuses or empty array for terminal/missing states", () => {
    expect(getNextStatuses(TICKET_WORKFLOW, "OPEN")).toEqual(["IN_PROGRESS", "CLOSED"]);
    expect(getNextStatuses(TICKET_WORKFLOW, "RESOLVED")).toEqual(["CLOSED", "IN_PROGRESS"]);
    expect(getNextStatuses(TICKET_WORKFLOW, "CLOSED")).toEqual([]);

    const partialTransitions = {
      ...TICKET_WORKFLOW,
      transitions: {} as Record<TicketStatus, readonly TicketStatus[]>,
    };
    expect(canTransition(partialTransitions, "OPEN", "IN_PROGRESS")).toBe(false);
    expect(getNextStatuses(partialTransitions, "OPEN")).toEqual([]);
  });
});
