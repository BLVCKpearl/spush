import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface ManagedUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  role: 'admin' | 'staff' | null;
  tenant_role: 'tenant_admin' | 'staff' | null;
  venue_id: string | null;
}

/**
 * Tenant-scoped users hook
 */
export function useUsers(tenantId: string | null) {
  return useQuery({
    queryKey: ['managed-users', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Fetch profiles for this tenant
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, is_active, created_at, venue_id')
        .eq('venue_id', tenantId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles for this tenant
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, tenant_role, tenant_id')
        .eq('tenant_id', tenantId);

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const users: ManagedUser[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || null,
          tenant_role: userRole?.tenant_role || null,
        };
      });

      // Filter to only show users with tenant roles
      return users.filter((u) => u.tenant_role !== null);
    },
    enabled: !!tenantId,
  });
}

/**
 * All users - only for super admins
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['all-managed-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, is_active, created_at, venue_id')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, tenant_role, tenant_id');

      if (rolesError) throw rolesError;

      const users: ManagedUser[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || null,
          tenant_role: userRole?.tenant_role || null,
        };
      });

      return users.filter((u) => u.role !== null || u.tenant_role !== null);
    },
  });
}

/**
 * Hook to get tenant context for mutations
 */
function useTenantContext() {
  try {
    return useTenant();
  } catch {
    return { tenantId: null, isImpersonating: false, validateTenantMutation: () => {}, logImpersonationAction: async () => {} };
  }
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      email,
      fullName,
      role,
      password,
      tenantId: overrideTenantId,
    }: {
      email: string;
      fullName: string;
      role: 'admin' | 'staff';
      password: string;
      tenantId?: string;
    }) => {
      const effectiveTenantId = overrideTenantId || tenantId;
      
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(effectiveTenantId);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          email,
          fullName,
          role,
          password,
          tenantId: effectiveTenantId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('user_created', { email, role });
      }

      return data as { success: boolean; userId: string; password: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async ({
      userId,
      fullName,
      role,
      tenantRole,
      isActive,
    }: {
      userId: string;
      fullName?: string;
      role?: 'admin' | 'staff';
      tenantRole?: 'tenant_admin' | 'staff';
      isActive?: boolean;
    }) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update',
          userId,
          fullName,
          role,
          tenantRole,
          isActive,
          tenantId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('user_updated', { userId, changes: { fullName, role, tenantRole, isActive } });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useResetPassword() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'reset_password',
          userId,
          tenantId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('password_reset', { userId });
      }

      return data as { success: boolean; temporaryPassword: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'deactivate',
          userId,
          tenantId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('user_deactivated', { userId });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useArchiveUser() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'archive',
          userId,
          tenantId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Log impersonation action if applicable
      if (isImpersonating) {
        await logImpersonationAction('user_archived', { userId });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { tenantId, isImpersonating, validateTenantMutation, logImpersonationAction } = useTenantContext();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Validate tenant mutation for impersonation safety
      validateTenantMutation(tenantId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'delete',
            userId,
            tenantId,
          },
        });

        clearTimeout(timeoutId);

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Log impersonation action if applicable
        if (isImpersonating) {
          await logImpersonationAction('user_deleted', { userId });
        }

        return data;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managed-users'] });
      queryClient.invalidateQueries({ queryKey: ['all-managed-users'] });
    },
  });
}

export function useAuditLogs(tenantId?: string | null) {
  return useQuery({
    queryKey: ['audit-logs', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}
