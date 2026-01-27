import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "@/hooks/use-toast";

interface SuperAdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that blocks SUPER_ADMIN from accessing /admin/* routes
 * unless they have an active impersonation session.
 * 
 * This ensures super admins always use impersonation to access tenant dashboards.
 */
export function SuperAdminRouteGuard({ children }: SuperAdminRouteGuardProps) {
  const { isSuperAdmin, isAuthenticated, loading } = useAuth();
  const { isImpersonating } = useImpersonation();
  const navigate = useNavigate();

  useEffect(() => {
    // Skip if still loading or not authenticated
    if (loading || !isAuthenticated) return;

    // If super admin without impersonation, redirect to impersonation page
    if (isSuperAdmin && !isImpersonating) {
      toast({
        title: "Impersonation Required",
        description: "Please select a tenant to manage via impersonation.",
        variant: "destructive",
      });
      navigate("/super-admin/impersonation", { replace: true });
    }
  }, [isSuperAdmin, isImpersonating, isAuthenticated, loading, navigate]);

  // Show nothing while redirecting
  if (isSuperAdmin && !isImpersonating && !loading) {
    return null;
  }

  return <>{children}</>;
}
