import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ManagedTenant {
  id: string;
  name: string;
  venue_slug: string;
  created_at: string;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_by: string | null;
  _count?: {
    users: number;
    orders: number;
  };
}

export function useTenants() {
  const { isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['super-admin-tenants'],
    queryFn: async () => {
      const { data: venues, error } = await supabase
        .from('venues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get counts for each venue
      const tenantsWithCounts = await Promise.all(
        (venues || []).map(async (venue) => {
          const [usersResult, ordersResult] = await Promise.all([
            supabase
              .from('user_roles')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', venue.id),
            supabase
              .from('orders')
              .select('id', { count: 'exact', head: true })
              .eq('venue_id', venue.id),
          ]);

          return {
            ...venue,
            _count: {
              users: usersResult.count || 0,
              orders: ordersResult.count || 0,
            },
          };
        })
      );

      return tenantsWithCounts as ManagedTenant[];
    },
    enabled: isSuperAdmin,
  });
}

export function useSuspendTenant() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tenantId, suspend }: { tenantId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from('venues')
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_by: suspend ? user?.id : null,
        })
        .eq('id', tenantId);

      if (error) throw error;
    },
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast.success(suspend ? 'Tenant suspended' : 'Tenant reactivated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Operation failed');
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from('venues')
        .insert({ name, venue_slug: slug })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-tenants'] });
      toast.success('Tenant created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create tenant');
    },
  });
}

export function useTenantAdmins(tenantId: string | null) {
  return useQuery({
    queryKey: ['tenant-admins', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          tenant_role,
          profiles!inner(email, display_name, is_active)
        `)
        .eq('tenant_id', tenantId)
        .eq('tenant_role', 'tenant_admin');

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}
