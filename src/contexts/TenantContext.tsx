import { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';
import { supabase } from '@/integrations/supabase/client';

export interface TenantContextValue {
  /** Current tenant ID - null for super admins when viewing globally */
  tenantId: string | null;
  /** All tenant IDs the user has access to */
  tenantIds: string[];
  /** Whether the user is a super admin (can access all tenants) */
  isSuperAdmin: boolean;
  /** Whether currently impersonating a tenant */
  isImpersonating: boolean;
  /** Whether tenant context is required for data access */
  requiresTenantScope: boolean;
  /** Check if user has access to a specific tenant */
  hasAccessToTenant: (tenantId: string) => boolean;
  /** Set the current tenant (for super admins switching between tenants) */
  setCurrentTenant: (tenantId: string) => void;
  /** Validate that a mutation targets the correct tenant (throws if cross-tenant) */
  validateTenantMutation: (targetTenantId: string | null | undefined) => void;
  /** Log an action during impersonation */
  logImpersonationAction: (action: string, metadata?: Record<string, unknown>) => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, tenantId: authTenantId, tenantIds, isSuperAdmin, setCurrentTenant } = useAuth();
  const { isImpersonating, impersonatedTenant } = useImpersonation();
  
  // Use impersonated tenant ID if super admin is impersonating
  const effectiveTenantId = isSuperAdmin && isImpersonating && impersonatedTenant
    ? impersonatedTenant.id
    : authTenantId;

  // Validate that mutations target the correct tenant during impersonation
  const validateTenantMutation = useCallback((targetTenantId: string | null | undefined) => {
    // Skip validation if no target tenant or not impersonating
    if (!targetTenantId) return;
    
    // If impersonating, MUST target the impersonated tenant
    if (isImpersonating && impersonatedTenant && targetTenantId !== impersonatedTenant.id) {
      throw new Error(
        `Cross-tenant mutation rejected: Cannot modify tenant ${targetTenantId} while impersonating ${impersonatedTenant.id}`
      );
    }
    
    // For non-super-admins, must target their own tenant
    if (!isSuperAdmin && effectiveTenantId && targetTenantId !== effectiveTenantId) {
      throw new Error(
        `Cross-tenant mutation rejected: Cannot modify tenant ${targetTenantId}`
      );
    }
  }, [isImpersonating, impersonatedTenant, isSuperAdmin, effectiveTenantId]);

  // Log impersonation actions for audit trail
  const logImpersonationAction = useCallback(async (
    action: string, 
    metadata?: Record<string, unknown>
  ) => {
    if (!isImpersonating || !impersonatedTenant || !user) return;
    
    try {
      await supabase.from('admin_audit_logs').insert({
        action: `impersonation_${action}`,
        actor_user_id: user.id,
        tenant_id: impersonatedTenant.id,
        metadata: {
          ...metadata,
          impersonated_tenant_name: impersonatedTenant.name,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.warn('Failed to log impersonation action:', err);
    }
  }, [isImpersonating, impersonatedTenant, user]);

  const value = useMemo<TenantContextValue>(() => ({
    tenantId: effectiveTenantId,
    tenantIds,
    isSuperAdmin,
    isImpersonating,
    // Super admins don't require tenant scope when viewing globally (not impersonating)
    requiresTenantScope: !isSuperAdmin || isImpersonating,
    hasAccessToTenant: (id: string) => {
      if (isSuperAdmin) return true;
      return tenantIds.includes(id);
    },
    setCurrentTenant,
    validateTenantMutation,
    logImpersonationAction,
  }), [
    effectiveTenantId, 
    tenantIds, 
    isSuperAdmin, 
    isImpersonating, 
    setCurrentTenant,
    validateTenantMutation,
    logImpersonationAction
  ]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within <TenantProvider>');
  }
  return ctx;
}

/**
 * Hook to get tenant-scoped query options
 * Returns the tenant ID to filter by, or undefined for super admins viewing globally
 */
export function useTenantFilter(): string | undefined {
  const { tenantId, isSuperAdmin, isImpersonating } = useTenant();
  
  // Super admins can view all data when no tenant is selected and not impersonating
  if (isSuperAdmin && !tenantId && !isImpersonating) {
    return undefined;
  }
  
  return tenantId ?? undefined;
}
