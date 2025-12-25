import { AppRole } from '@/types/database';

export type PermissionType = 'read' | 'write' | 'delete' | 'share' | 'admin';

export const rolePermissions: Record<AppRole, PermissionType[]> = {
  viewer: ['read'],
  editor: ['read', 'write', 'share'],
  admin: ['read', 'write', 'delete', 'share', 'admin'],
  owner: ['read', 'write', 'delete', 'share', 'admin'],
};

export function hasPermission(role: AppRole, permission: PermissionType): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function canRead(role: AppRole): boolean {
  return hasPermission(role, 'read');
}

export function canWrite(role: AppRole): boolean {
  return hasPermission(role, 'write');
}

export function canDelete(role: AppRole): boolean {
  return hasPermission(role, 'delete');
}

export function canShare(role: AppRole): boolean {
  return hasPermission(role, 'share');
}

export function canAdmin(role: AppRole): boolean {
  return hasPermission(role, 'admin');
}


