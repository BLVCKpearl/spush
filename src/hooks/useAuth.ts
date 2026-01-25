import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext, type UserRole } from "@/contexts/AuthContext";

export type { UserRole };

// NOTE: This is now backed by a single global provider (AuthProvider) to avoid
// multiple independent auth listeners/state instances (which breaks sign out).
export function useAuth() {
  return useAuthContext();
}

export function useRequireAuth(requiredRole?: 'admin' | 'staff' | 'any') {
  const { user, role, isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/admin/login');
      return;
    }

    // Check role requirements
    const hasAccess = 
      requiredRole === 'any' ? (isAdmin || isStaff) :
      requiredRole === 'admin' ? isAdmin :
      requiredRole === 'staff' ? (isAdmin || isStaff) : // Admin can do staff things too
      (isAdmin || isStaff); // Default: any authenticated staff/admin

    if (!hasAccess) {
      navigate('/admin/login');
    }
  }, [user, role, isAdmin, isStaff, loading, navigate, requiredRole]);

  return { user, role, isAdmin, isStaff, loading };
}
