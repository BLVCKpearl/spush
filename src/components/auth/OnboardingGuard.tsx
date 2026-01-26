import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import AuthLoadingScreen from "./AuthLoadingScreen";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const location = useLocation();
  const { isAuthenticated, isSuperAdmin, loading } = useAuth();
  const { data: onboardingStatus, isLoading: onboardingLoading } = useOnboardingStatus();

  // Don't guard the onboarding page itself
  if (location.pathname === "/admin/onboarding") {
    return <>{children}</>;
  }

  if (loading || onboardingLoading) {
    return <AuthLoadingScreen authState="loading_profile" />;
  }
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Not authenticated - let AdminRouteGuard handle this
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Redirect to onboarding if not completed
  if (onboardingStatus && !onboardingStatus.completed) {
    return <Navigate to="/admin/onboarding" replace />;
  }

  return <>{children}</>;
}
