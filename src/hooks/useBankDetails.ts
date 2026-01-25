import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BankDetails } from '@/types/database';

export function useBankDetails() {
  return useQuery({
    queryKey: ['bank-details'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as BankDetails | null;
    },
  });
}

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
      // First, deactivate all existing bank details
      await supabase
        .from('bank_details')
        .update({ is_active: false })
        .eq('is_active', true);

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
