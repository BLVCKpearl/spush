import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentClaim {
  id: string;
  order_id: string;
  claimed_at: string;
  proof_url: string | null;
  sender_name: string | null;
  bank_name: string | null;
  notes: string | null;
  created_at: string;
}

export function usePaymentClaims(orderId: string | undefined) {
  return useQuery({
    queryKey: ['payment-claims', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('payment_claims')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentClaim[];
    },
    enabled: !!orderId,
  });
}

export function useCreatePaymentClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      proofFile,
      senderName,
      bankName,
      notes,
    }: {
      orderId: string;
      proofFile?: File;
      senderName?: string;
      bankName?: string;
      notes?: string;
    }) => {
      let proofUrl: string | null = null;

      // Upload proof image if provided
      if (proofFile) {
        const fileExt = proofFile.name.split('.').pop();
        const fileName = `claim-${orderId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        proofUrl = publicUrl;
      }

      // Create the payment claim
      const { data, error } = await supabase
        .from('payment_claims')
        .insert({
          order_id: orderId,
          proof_url: proofUrl,
          sender_name: senderName || null,
          bank_name: bankName || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PaymentClaim;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-claims', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
