import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

interface AnalyticsData {
  paidOrdersCount: number;
  totalRevenueKobo: number;
  averageOrderValueKobo: number;
}

interface ServedOrder {
  id: string;
  order_reference: string;
  table_number: number;
  table_label: string | null;
  total_kobo: number;
  payment_method: 'bank_transfer' | 'cash';
  created_at: string;
}

// Statuses that represent "paid" orders
const PAID_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'completed'];

/**
 * Tenant-scoped analytics hook
 * @param tenantId - Required for tenant admins, optional for super admins
 */
export function useTodayAnalytics(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['analytics', 'today', tenantId],
    queryFn: async (): Promise<AnalyticsData> => {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      let query = supabase
        .from('orders')
        .select('id, total_kobo')
        .in('status', PAID_STATUSES)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      // Always scope to tenant when provided
      if (tenantId) {
        query = query.eq('venue_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const orders = data || [];
      const paidOrdersCount = orders.length;
      const totalRevenueKobo = orders.reduce((sum, order) => sum + order.total_kobo, 0);
      const averageOrderValueKobo = paidOrdersCount > 0 
        ? Math.round(totalRevenueKobo / paidOrdersCount) 
        : 0;

      return {
        paidOrdersCount,
        totalRevenueKobo,
        averageOrderValueKobo,
      };
    },
    enabled: tenantId !== undefined, // Allow null for super admins
  });
}

/**
 * Served/completed orders for today, tenant-scoped
 */
export function useServedOrders(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['analytics', 'served-orders', tenantId],
    queryFn: async (): Promise<ServedOrder[]> => {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      let query = supabase
        .from('orders')
        .select('id, order_reference, table_number, table_label, total_kobo, payment_method, created_at')
        .eq('status', 'completed')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .order('created_at', { ascending: false });

      if (tenantId) {
        query = query.eq('venue_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ServedOrder[];
    },
    enabled: tenantId !== undefined,
  });
}

/**
 * Venues list for super admins
 */
export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });
}
