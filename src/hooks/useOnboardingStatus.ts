import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface OnboardingStatus {
  completed: boolean;
  step: number; // 0 = not started, 1 = tables, 2 = menu, 3 = bank details, 4 = complete
  hasTables: boolean;
  hasMenuItems: boolean;
  hasBankDetails: boolean;
}

export function useOnboardingStatus() {
  const { user, isAuthenticated, isSuperAdmin } = useAuth();
  const { tenantId, isImpersonating } = useTenant();

  return useQuery({
    queryKey: ["onboarding-status", user?.id, tenantId],
    queryFn: async (): Promise<OnboardingStatus> => {
      if (!user?.id || !tenantId) return { completed: true, step: 4, hasTables: true, hasMenuItems: true, hasBankDetails: true };

      // Check profile onboarding status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching onboarding status:", profileError);
        return { completed: true, step: 4, hasTables: true, hasMenuItems: true, hasBankDetails: true };
      }

      // If already completed, return early
      if (profile?.onboarding_completed) {
        return { completed: true, step: 4, hasTables: true, hasMenuItems: true, hasBankDetails: true };
      }

      // Check actual progress: tables, menu items, bank details
      const [tablesResult, menuResult, bankResult] = await Promise.all([
        supabase.from("tables").select("id", { count: "exact", head: true }).eq("venue_id", tenantId),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("venue_id", tenantId),
        supabase.from("bank_details").select("id", { count: "exact", head: true }).eq("venue_id", tenantId),
      ]);

      const hasTables = (tablesResult.count ?? 0) > 0;
      const hasMenuItems = (menuResult.count ?? 0) > 0;
      const hasBankDetails = (bankResult.count ?? 0) > 0;

      // Determine current step
      let step = 1; // Start with tables
      if (hasTables) step = 2; // Move to menu
      if (hasTables && hasMenuItems) step = 3; // Move to bank details
      if (hasTables && hasMenuItems && hasBankDetails) step = 4; // Complete

      const completed = step === 4;

      return { completed, step, hasTables, hasMenuItems, hasBankDetails };
    },
    // Enable for tenant admins OR super admins who are impersonating
    enabled: isAuthenticated && !!user?.id && !!tenantId && (!isSuperAdmin || isImpersonating),
    staleTime: 30000,
  });
}
