import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Category, MenuItem, MenuItemWithCategory } from '@/types/database';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
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
