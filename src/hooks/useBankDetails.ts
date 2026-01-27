import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import type { BankDetails } from '@/types/database';

/**
 * Hook for guests to fetch bank details via edge function (bypasses RLS)
 * Use this on public-facing pages like order confirmation
 */
export function useBankDetails(venueId?: string | null) {
  return useQuery({
    queryKey: ['bank-details', venueId],
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data, error } = await supabase.functions.invoke('get-bank-details', {
        body: { venueId },
      });
      
      if (error) throw error;
      return data?.bankDetails as BankDetails | null;
    },
    enabled: !!venueId,
  });
}

/**
 * Tenant-scoped bank details for admin usage
 */
export function useTenantBankDetails(tenantId: string | null) {
  return useQuery({
    queryKey: ['bank-details', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('venue_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankDetails[];
    },
    enabled: !!tenantId,
  });
}

/**
 * All bank details - only for super admins
 */
export function useAllBankDetails() {
  return useQuery({
    queryKey: ['all-bank-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankDetails[];
    },
  });
}

/**
 * Hook to get tenant context for mutations with fallback
 */
function useTenantContext() {
  try {
    return useTenant();
  } catch {
    return { 
      tenantId: null, 
      isImpersonating: false, 
      validateTenantMutation: () => {}, 
      logImpersonationAction: async () => {} 
    };
  }
}

/**
 * Log bank details mutation to audit log
 */
async function logBankAudit(
  action: string,
  bankAccountId: string | null,
  tenantId: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('admin_audit_logs').insert({
      action,
      actor_user_id: user.id,
      tenant_id: tenantId,
      metadata: {
        ...metadata,
        bank_account_id: bankAccountId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('Failed to log bank audit:', err);
  }
}

export function useCreateBankDetails() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (details: Omit<BankDetails, 'id' | 'created_at'>) => {
      const effectiveVenueId = details.venue_id || tenantId;
      
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(effectiveVenueId);

      // First, deactivate all existing bank details for this venue if setting active
      if (effectiveVenueId && details.is_active) {
        await supabase
          .from('bank_details')
          .update({ is_active: false })
          .eq('venue_id', effectiveVenueId)
          .eq('is_active', true);
      }

      const { data, error } = await supabase
        .from('bank_details')
        .insert({ ...details, venue_id: effectiveVenueId })
        .select()
        .single();

      if (error) throw error;
      
      const bankDetails = data as BankDetails;

      // Log audit
      await logBankAudit('bank_details_created', bankDetails.id, effectiveVenueId, {
        bank_name: details.bank_name,
        account_name: details.account_name,
        is_active: details.is_active,
      });

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('bank_details_created', { 
          bank_name: details.bank_name 
        });
      }

      return bankDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}

export function useUpdateBankDetails() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      id,
      ...details
    }: Partial<BankDetails> & { id: string }) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      // If setting as active, deactivate others first
      if (details.is_active && tenantId) {
        await supabase
          .from('bank_details')
          .update({ is_active: false })
          .eq('venue_id', tenantId)
          .eq('is_active', true)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('bank_details')
        .update(details)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const bankDetails = data as BankDetails;

      // Log audit
      await logBankAudit('bank_details_updated', id, tenantId, {
        changes: details,
      });

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('bank_details_updated', { 
          bank_account_id: id,
          changes: details 
        });
      }

      return bankDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}

export function useDeleteBankDetails() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (id: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      // Get details before deleting for audit
      const { data: existingDetails } = await supabase
        .from('bank_details')
        .select('bank_name, account_name')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('bank_details')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await logBankAudit('bank_details_deleted', id, tenantId, {
        bank_name: existingDetails?.bank_name,
        account_name: existingDetails?.account_name,
      });

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('bank_details_deleted', { 
          bank_account_id: id,
          bank_name: existingDetails?.bank_name 
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}

export function useArchiveBankDetails() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (id: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const { data, error } = await supabase
        .from('bank_details')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const bankDetails = data as BankDetails;

      // Log audit
      await logBankAudit('bank_details_archived', id, tenantId, {
        bank_name: bankDetails.bank_name,
      });

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('bank_details_archived', { 
          bank_account_id: id 
        });
      }

      return bankDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}
