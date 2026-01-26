import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Category, MenuItemWithCategory } from '@/types/database';

export function useCategories(venueId?: string) {
  return useQuery({
    queryKey: ['categories', venueId],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      // Filter by venue_id if provided
      if (venueId) {
        query = query.eq('venue_id', venueId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!venueId || venueId === undefined, // Allow undefined for super admins
  });
}

/**
 * Tenant-scoped categories for admin usage
 */
export function useTenantCategories(tenantId: string | null) {
  return useQuery({
    queryKey: ['categories', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('venue_id', tenantId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!tenantId,
  });
}

export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: ['menu-items', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*, categories(*)')
        .eq('is_available', true)
        .order('name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MenuItemWithCategory[];
    },
  });
}

export function useVenueMenuItems(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-menu-items', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(*)')
        .eq('venue_id', venueId!)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as MenuItemWithCategory[];
    },
  });
}

/**
 * Tenant-scoped menu items for admin usage
 */
export function useTenantMenuItems(tenantId: string | null) {
  return useQuery({
    queryKey: ['menu-items', 'tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(*)')
        .eq('venue_id', tenantId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as MenuItemWithCategory[];
    },
    enabled: !!tenantId,
  });
}

export function useAllMenuItems() {
  return useQuery({
    queryKey: ['all-menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, categories(*)')
        .order('name');
      
      if (error) throw error;
      return data as MenuItemWithCategory[];
    },
  });
}
