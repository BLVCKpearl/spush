import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Order, OrderWithItems, OrderStatus, PaymentMethod, CartItem, ItemSnapshot } from '@/types/database';
import { useEffect } from 'react';

export function useOrder(orderReference: string) {
  return useQuery({
    queryKey: ['order', orderReference],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, menu_items(*)),
          payment_proofs(*)
        `)
        .eq('order_reference', orderReference)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return {
        ...data,
        order_items: data.order_items.map((item: any) => ({
          ...item,
          item_snapshot: item.item_snapshot as ItemSnapshot,
        })),
      } as OrderWithItems;
    },
    enabled: !!orderReference,
  });
}

/**
 * Tenant-scoped orders hook for admin dashboard
 */
export function useOrders(tenantId?: string | null, status?: OrderStatus) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['orders', tenantId, status],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select(`
          *,
          order_items(*, menu_items(*)),
          payment_proofs(*)
        `)
        .order('created_at', { ascending: false });
      
      // Always scope to tenant for non-super-admin queries
      if (tenantId) {
        q = q.eq('venue_id', tenantId);
      }
      
      if (status) {
        q = q.eq('status', status);
      }
      
      const { data, error } = await q;
      
      if (error) throw error;
      
      return (data || []).map((order: any) => ({
        ...order,
        order_items: order.order_items.map((item: any) => ({
          ...item,
          item_snapshot: item.item_snapshot as ItemSnapshot,
        })),
      })) as OrderWithItems[];
    },
  });

  // Real-time subscription for order updates (scoped to tenant)
  useEffect(() => {
    const channelName = tenantId ? `orders-realtime-${tenantId}` : 'orders-realtime';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(tenantId && { filter: `venue_id=eq.${tenantId}` }),
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, tenantId]);

  return query;
}

// Check rate limit before creating order
async function checkRateLimit(tableId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_order_rate_limit', {
    p_table_id: tableId,
  });
  if (error) {
    console.error('Rate limit check failed:', error);
    return true;
  }
  return data as boolean;
}

// Record rate limit entry after order creation
async function recordRateLimit(tableId: string): Promise<void> {
  await supabase.rpc('record_order_rate_limit', {
    p_table_id: tableId,
  });
}

// Check for existing order with idempotency key
async function findExistingOrder(idempotencyKey: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  
  if (error) {
    console.error('Idempotency check failed:', error);
    return null;
  }
  return data as Order | null;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      tableId,
      tableNumber,
      customerName,
      paymentMethod,
      items,
      idempotencyKey,
    }: {
      venueId?: string;
      tableId?: string;
      tableNumber: number;
      customerName?: string;
      paymentMethod: PaymentMethod;
      items: CartItem[];
      idempotencyKey?: string;
    }) => {
      // 1. Check for duplicate order using idempotency key
      if (idempotencyKey) {
        const existingOrder = await findExistingOrder(idempotencyKey);
        if (existingOrder) {
          console.log('Returning existing order for idempotency key:', idempotencyKey);
          return existingOrder;
        }
      }

      // 2. Check rate limit if we have a table ID
      if (tableId) {
        const allowed = await checkRateLimit(tableId);
        if (!allowed) {
          throw new Error('Too many orders from this table. Please wait a few minutes.');
        }
      }

      const totalKobo = items.reduce(
        (sum, item) => sum + item.menuItem.price_kobo * item.quantity,
        0
      );

      const initialStatus = paymentMethod === 'cash' ? 'cash_on_delivery' : 'pending_payment';

      // 3. Create the order with venue_id for tenant scoping
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          venue_id: venueId || null,
          table_id: tableId || null,
          table_number: tableNumber,
          customer_name: customerName || null,
          payment_method: paymentMethod,
          status: initialStatus,
          total_kobo: totalKobo,
          order_reference: '',
          idempotency_key: idempotencyKey || null,
        })
        .select()
        .single();

      if (orderError) {
        if (orderError.code === '23505' && idempotencyKey) {
          const existingOrder = await findExistingOrder(idempotencyKey);
          if (existingOrder) {
            return existingOrder;
          }
        }
        throw orderError;
      }

      // 4. Create order items with snapshots
      const orderItems = items.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price_kobo: item.menuItem.price_kobo,
        item_snapshot: {
          name: item.menuItem.name,
          description: item.menuItem.description,
          price_kobo: item.menuItem.price_kobo,
        },
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 5. Record rate limit entry
      if (tableId) {
        await recordRateLimit(tableId);
      }

      return order as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders')
        .update({ payment_confirmed: true, status: 'confirmed' })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      file,
    }: {
      orderId: string;
      file: File;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('payment_proofs')
        .insert({
          order_id: orderId,
          image_url: publicUrl,
        });

      if (insertError) throw insertError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
