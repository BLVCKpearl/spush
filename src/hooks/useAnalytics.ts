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

// Statuses that represent "paid" orders
const PAID_STATUSES: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'completed'];

export function useTodayAnalytics(venueId?: string) {
  return useQuery({
    queryKey: ['analytics', 'today', venueId],
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

      if (venueId) {
        query = query.eq('venue_id', venueId);
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
  });
}

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
