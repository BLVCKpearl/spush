import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';

export type FeatureFlag = 
  | 'cash_payments'
  | 'bank_transfers'
  | 'customer_name_required'
  | 'show_estimated_time'
  | 'advanced_analytics'
  | 'multi_location'
  | 'loyalty_program'
  | 'custom_branding';

interface FeatureFlags {
  [key: string]: boolean;
}

interface UseFeatureFlagsResult {
  flags: FeatureFlags;
  isEnabled: (flag: FeatureFlag) => boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to check feature flags for the current tenant
 * Super admins can override all flags (always returns true)
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const { tenantId, isSuperAdmin } = useTenant();
  const { isSuperAdmin: authIsSuperAdmin } = useAuth();

  const { data: flags = {}, isLoading, error } = useQuery({
    queryKey: ['feature-flags', tenantId],
    queryFn: async () => {
      if (!tenantId) return {};

      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('feature_key, is_enabled')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Convert to key-value object
      const flagsMap: FeatureFlags = {};
      for (const flag of data || []) {
        flagsMap[flag.feature_key] = flag.is_enabled;
      }
      return flagsMap;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isEnabled = (flag: FeatureFlag): boolean => {
    // Super admins always have access to all features
    if (isSuperAdmin || authIsSuperAdmin) {
      return true;
    }
    return flags[flag] ?? false;
  };

  return {
    flags,
    isEnabled,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook to manage feature flags (for admins)
 */
export function useFeatureFlagsAdmin(tenantId?: string) {
  const { data: flags = [], isLoading, error, refetch } = useQuery({
    queryKey: ['feature-flags-admin', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('tenant_feature_flags')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('feature_key');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const updateFlag = async (featureKey: string, isEnabled: boolean) => {
    if (!tenantId) throw new Error('Tenant ID required');

    const { error } = await supabase
      .from('tenant_feature_flags')
      .upsert({
        tenant_id: tenantId,
        feature_key: featureKey,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,feature_key',
      });

    if (error) throw error;
    await refetch();
  };

  return {
    flags,
    isLoading,
    error: error as Error | null,
    updateFlag,
    refetch,
  };
}
