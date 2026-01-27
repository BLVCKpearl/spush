import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TenantSuspensionResult {
  isSuspended: boolean;
  venueName: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check if the current user's tenant is suspended
 * Returns suspension status for non-super-admin users
 */
export function useTenantSuspension(): TenantSuspensionResult {
  const { tenantId, isSuperAdmin, loading: authLoading } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tenant-suspension', tenantId],
    queryFn: async () => {
      if (!tenantId) return { isSuspended: false, venueName: null };

      const { data: venue, error } = await supabase
        .from('venues')
        .select('is_suspended, name')
        .eq('id', tenantId)
        .maybeSingle();

      if (error) throw error;

      return {
        isSuspended: venue?.is_suspended ?? false,
        venueName: venue?.name ?? null,
      };
    },
    enabled: !!tenantId && !isSuperAdmin && !authLoading,
    staleTime: 30 * 1000, // Check every 30 seconds
  });

  // Super admins are never considered suspended
  if (isSuperAdmin) {
    return {
      isSuspended: false,
      venueName: null,
      isLoading: false,
      error: null,
    };
  }

  return {
    isSuspended: data?.isSuspended ?? false,
    venueName: data?.venueName ?? null,
    isLoading: authLoading || isLoading,
    error: error as Error | null,
  };
}
