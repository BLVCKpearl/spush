import { useAuth } from '@/contexts/AuthContext';
import { getPermissions, type Permission } from '@/lib/permissions';

export function usePermissions(): Permission {
  const { role } = useAuth();
  return getPermissions(role);
}
