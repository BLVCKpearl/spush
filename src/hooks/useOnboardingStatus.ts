import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboardingStatus() {
  const { user, isAuthenticated, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async () => {
      if (!user?.id) return { completed: true };

      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching onboarding status:", error);
        return { completed: true }; // Fail open to avoid blocking
      }

      return { completed: data?.onboarding_completed ?? false };
    },
    enabled: isAuthenticated && !isSuperAdmin && !!user?.id,
    staleTime: 30000,
  });
}
