import { useAuth } from '@/contexts/AuthContext';
import { getPermissions, isSuperAdmin, isTenantAdmin, isStaffOrHigher, type Permission } from '@/lib/permissions';

export type { Permission };

export function usePermissions(): Permission {
  const { role } = useAuth();
  return getPermissions(role);
}

export function useIsSuperAdmin(): boolean {
  const { role } = useAuth();
  return isSuperAdmin(role);
}

export function useIsTenantAdmin(): boolean {
  const { role } = useAuth();
  return isTenantAdmin(role);
}

export function useIsStaffOrHigher(): boolean {
  const { role } = useAuth();
  return isStaffOrHigher(role);
}
