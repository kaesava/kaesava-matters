import { defineAppRolePolicy } from "@kaesava/core";

export type TradieAppRole = "OWNER" | "ADMIN" | "TRADIE" | "BOOKKEEPER";

export type TradiePermission =
  | "business:read"
  | "business:write"
  | "team:read"
  | "team:write"
  | "team:read_cost_rates"
  | "jobs:read"
  | "jobs:write"
  | "quotes:write"
  | "invoices:read"
  | "invoices:write"
  | "timesheets:write"
  | "reports:read";

export const tradieRolePolicy = defineAppRolePolicy<TradieAppRole, TradiePermission>({
  OWNER: {
    baseRole: "OWNER",
    permissions: ["*"],
  },
  ADMIN: {
    baseRole: "MEMBER",
    permissions: [
      "business:read",
      "business:write",
      "team:read",
      "team:write",
      "team:read_cost_rates",
      "jobs:read",
      "jobs:write",
      "quotes:write",
      "invoices:read",
      "invoices:write",
      "timesheets:write",
      "reports:read",
    ],
  },
  TRADIE: {
    baseRole: "MEMBER",
    permissions: [
      "business:read",
      "team:read",
      "jobs:read",
      "jobs:write",
      "quotes:write",
      "timesheets:write",
    ],
  },
  BOOKKEEPER: {
    baseRole: "VIEWER",
    permissions: [
      "business:read",
      "team:read",
      "team:read_cost_rates",
      "invoices:read",
      "reports:read",
    ],
  },
});

export function canReadInternalCostRates(
  baseRole: string | null | undefined,
  appRole: string | null | undefined
): boolean {
  return tradieRolePolicy.can(baseRole, appRole, "team:read_cost_rates");
}

export function canManageBusiness(
  baseRole: string | null | undefined,
  appRole: string | null | undefined
): boolean {
  return tradieRolePolicy.can(baseRole, appRole, "business:write");
}

export function canManageTeam(
  baseRole: string | null | undefined,
  appRole: string | null | undefined
): boolean {
  return tradieRolePolicy.can(baseRole, appRole, "team:write");
}
