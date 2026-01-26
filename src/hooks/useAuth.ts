import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext, type UserRole } from "@/contexts/AuthContext";

export type { UserRole };

// NOTE: This is now backed by a single global provider (AuthProvider) to avoid
// multiple independent auth listeners/state instances (which breaks sign out).
export function useAuth() {
  return useAuthContext();
}

export function useRequireAuth(requiredRole?: 'super_admin' | 'tenant_admin' | 'staff' | 'any') {
  const { user, role, isSuperAdmin, isTenantAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/admin/login');
      return;
    }

    // Check role requirements
    const hasAccess = 
      requiredRole === 'any' ? (isSuperAdmin || isTenantAdmin || isStaff) :
      requiredRole === 'super_admin' ? isSuperAdmin :
      requiredRole === 'tenant_admin' ? (isSuperAdmin || isTenantAdmin) :
      requiredRole === 'staff' ? (isSuperAdmin || isTenantAdmin || isStaff) :
      (isSuperAdmin || isTenantAdmin || isStaff); // Default: any authenticated staff/admin

    if (!hasAccess) {
      navigate('/admin/login');
    }
  }, [user, role, isSuperAdmin, isTenantAdmin, isStaff, loading, navigate, requiredRole]);

  return { user, role, isSuperAdmin, isTenantAdmin, isStaff, loading };
}
