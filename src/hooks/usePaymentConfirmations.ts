import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentConfirmation {
  id: string;
  order_id: string;
  confirmed_by: string;
  confirmed_at: string;
  method: string;
  notes: string | null;
  created_at: string;
}

export function usePaymentConfirmation(orderId: string | undefined) {
  return useQuery({
    queryKey: ['payment-confirmation', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('payment_confirmations')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();
      
      if (error) throw error;
      return data as PaymentConfirmation | null;
    },
    enabled: !!orderId,
  });
}

export function useCreatePaymentConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      method = 'manual',
      notes,
    }: {
      orderId: string;
      method?: string;
      notes?: string;
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Check if payment already confirmed (prevent double confirmation)
      const { data: existingConfirmation } = await supabase
        .from('payment_confirmations')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingConfirmation) {
        throw new Error('Payment has already been confirmed for this order');
      }

      // 2. Also check order's payment_confirmed flag
      const { data: order } = await supabase
        .from('orders')
        .select('payment_confirmed, status')
        .eq('id', orderId)
        .single();

      if (order?.payment_confirmed) {
        throw new Error('Payment has already been confirmed for this order');
      }

      // 3. Create payment confirmation
      const { data: confirmation, error: confirmError } = await supabase
        .from('payment_confirmations')
        .insert({
          order_id: orderId,
          confirmed_by: user.id,
          method,
          notes: notes || null,
        })
        .select()
        .single();

      if (confirmError) {
        // Handle unique constraint violation (race condition)
        if (confirmError.code === '23505') {
          throw new Error('Payment has already been confirmed for this order');
        }
        throw confirmError;
      }

      // 4. Update order status to confirmed and set payment_confirmed
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          payment_confirmed: true 
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      return confirmation as PaymentConfirmation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-confirmation', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
