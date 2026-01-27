import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffInvitation {
  id: string;
  tenant_id: string;
  email: string;
  role: 'tenant_admin' | 'staff';
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useStaffInvitations(tenantId: string | null) {
  return useQuery({
    queryKey: ['staff-invitations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StaffInvitation[];
    },
    enabled: !!tenantId,
  });
}

export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      role,
      tenantId,
    }: {
      email: string;
      role: 'tenant_admin' | 'staff';
      tenantId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-staff-invitation', {
        body: { email, role, tenantId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as { success: boolean; inviteUrl: string; expiresAt: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', variables.tenantId] });
    },
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, tenantId }: { invitationId: string; tenantId: string }) => {
      const { error } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      return { success: true, tenantId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', result.tenantId] });
    },
  });
}

export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: ['validate-invitation', token],
    queryFn: async () => {
      if (!token) return null;

      // Hash the token client-side to compare
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const tokenHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { data: invitation, error } = await supabase
        .rpc('validate_invitation_token', { p_token_hash: tokenHash })
        .maybeSingle();

      if (error) throw error;
      return invitation as {
        invitation_id: string;
        tenant_id: string;
        email: string;
        role: 'tenant_admin' | 'staff';
        venue_name: string;
      } | null;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({
      token,
      password,
      fullName,
    }: {
      token: string;
      password: string;
      fullName: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { token, password, fullName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as { success: boolean; message: string; existingUser: boolean };
    },
  });
}
