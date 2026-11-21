export type TenantPermissionAction =
  | "read"
  | "write"
  | "manage_members"
  | "manage_billing"
  | "delete_tenant";

const ROLE_PERMISSIONS: Record<string, ReadonlySet<TenantPermissionAction>> = {
  OWNER: new Set<TenantPermissionAction>([
    "read",
    "write",
    "manage_members",
    "manage_billing",
    "delete_tenant",
  ]),
  MEMBER: new Set<TenantPermissionAction>(["read", "write"]),
  VIEWER: new Set<TenantPermissionAction>(["read"]),
};

/**
 * Evaluates whether a tenant member role is permitted to perform an action.
 */
export function canRolePerform(
  role: string | null | undefined,
  action: TenantPermissionAction
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role.toUpperCase()]?.has(action) ?? false;
}
