import { request } from "./http";

/** service-finder-backend's /staff/roles — a business's roles. Mirrors modules/staff-roles/staff-roles.validators.ts. */

export interface Role {
  id: string;
  accountId: string;
  name: string;
  description: string | null;
  /** The business's Owner role: every permission, can't be renamed, edited or deleted. */
  isSystem: boolean;
  permissions: string[];
  memberCount: number;
  createdAt: string;
}

export interface Permission {
  key: string;
  name: string;
  description: string | null;
}

export async function listRoles(): Promise<Role[]> {
  const { roles } = await request<{ roles: Role[] }>("/staff/roles", { auth: true });
  return roles;
}

/** The fixed catalog, in display order. */
export async function listPermissions(): Promise<Permission[]> {
  const { permissions } = await request<{ permissions: Permission[] }>("/staff/roles/permissions", {
    auth: true,
  });
  return permissions;
}

export async function createRole(payload: {
  name: string;
  description?: string;
  permissionKeys: string[];
}): Promise<Role> {
  const { role } = await request<{ role: Role }>("/staff/roles", {
    method: "POST",
    auth: true,
    body: payload,
  });
  return role;
}

export async function updateRole(
  roleId: string,
  patch: { name?: string; description?: string | null },
): Promise<Role> {
  const { role } = await request<{ role: Role }>(`/staff/roles/${roleId}`, {
    method: "PATCH",
    auth: true,
    body: patch,
  });
  return role;
}

export async function updateRolePermissions(
  roleId: string,
  permissionKeys: string[],
): Promise<Role> {
  const { role } = await request<{ role: Role }>(`/staff/roles/${roleId}/permissions`, {
    method: "PATCH",
    auth: true,
    body: { permissionKeys },
  });
  return role;
}

export function deleteRole(roleId: string): Promise<void> {
  return request(`/staff/roles/${roleId}`, { method: "DELETE", auth: true });
}

/**
 * Whether the caller could hand this role out, edit it or act on its
 * holders — the backend's rule (staff-roles.service.ts's assertCovers),
 * mirrored so the UI only offers what will work. An owner can do
 * anything; anyone else only a non-Owner role whose every permission
 * they hold themselves. The backend checks again regardless.
 */
export function canReachRole(
  role: Pick<Role, "isSystem" | "permissions">,
  caller: { isOwner: boolean; permissions: readonly string[] },
): boolean {
  if (caller.isOwner) return true;
  if (role.isSystem) return false;
  return role.permissions.every((key) => caller.permissions.includes(key));
}
