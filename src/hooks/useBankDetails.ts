import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export function useCreateBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (details: Omit<BankDetails, 'id' | 'created_at'>) => {
      // First, deactivate all existing bank details for this venue
      if (details.venue_id) {
        await supabase
          .from('bank_details')
          .update({ is_active: false })
          .eq('venue_id', details.venue_id)
          .eq('is_active', true);
      }

      const { data, error } = await supabase
        .from('bank_details')
        .insert(details)
        .select()
        .single();

      if (error) throw error;
      return data as BankDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}

export function useUpdateBankDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...details
    }: Partial<BankDetails> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_details')
        .update(details)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BankDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-details'] });
      queryClient.invalidateQueries({ queryKey: ['all-bank-details'] });
    },
  });
}
