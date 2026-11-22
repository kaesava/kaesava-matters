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

export interface AppRoleDefinition<TPermission extends string = string> {
  baseRole: "OWNER" | "MEMBER" | "VIEWER";
  permissions: readonly (TPermission | "*")[];
}

/**
 * 2-Layer RBAC policy builder for Ring 3 apps.
 * Maps app-specific roles (e.g., COORDINATOR, TRADIE, APPRENTICE) onto platform base roles
 * while evaluating granular domain permissions.
 */
export function defineAppRolePolicy<
  TRole extends string,
  TPermission extends string
>(roles: Record<TRole, AppRoleDefinition<TPermission>>) {
  return {
    roles,
    getBaseRole(appRole: TRole): "OWNER" | "MEMBER" | "VIEWER" {
      return roles[appRole].baseRole;
    },
    can(
      baseRole: string | null | undefined,
      appRole: string | null | undefined,
      permission: TPermission
    ): boolean {
      if (baseRole?.toUpperCase() === "OWNER") return true;
      if (!appRole || !(appRole in roles)) return false;
      const perms = roles[appRole as TRole].permissions;
      return perms.includes("*") || perms.includes(permission);
    },
  };
}
