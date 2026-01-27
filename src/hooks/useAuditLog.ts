import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useCallback } from 'react';

export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'impersonation_start'
  | 'impersonation_end'
  | 'payment_confirmed'
  | 'order_status_change'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_role_changed'
  | 'password_reset'
  | 'tenant_suspended'
  | 'tenant_reactivated'
  | 'feature_flag_changed'
  | 'invalid_role_access_attempt';

interface AuditLogParams {
  action: AuditAction;
  targetUserId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the admin_audit_logs table
 * Returns a promise that resolves even if logging fails
 */
export async function logAuditEvent(
  actorUserId: string,
  params: AuditLogParams
): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      action: params.action,
      actor_user_id: actorUserId,
      target_user_id: params.targetUserId ?? null,
      tenant_id: params.tenantId ?? null,
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Never let audit logging block the main operation
    console.warn('Failed to log audit event:', err);
  }
}

/**
 * Hook for easy audit logging with automatic actor/tenant context
 */
export function useAuditLog() {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const log = useCallback(
    async (
      action: AuditAction,
      options?: {
        targetUserId?: string;
        tenantIdOverride?: string;
        metadata?: Record<string, unknown>;
      }
    ) => {
      if (!user) {
        console.warn('Cannot log audit event: no authenticated user');
        return;
      }

      await logAuditEvent(user.id, {
        action,
        targetUserId: options?.targetUserId,
        tenantId: options?.tenantIdOverride ?? tenantId ?? undefined,
        metadata: options?.metadata,
      });
    },
    [user, tenantId]
  );

  return { log };
}
