import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useImpersonation } from './ImpersonationContext';

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
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenantId: authTenantId, tenantIds, isSuperAdmin, setCurrentTenant } = useAuth();
  const { isImpersonating, impersonatedTenant } = useImpersonation();
  
  // Use impersonated tenant ID if super admin is impersonating
  const effectiveTenantId = isSuperAdmin && isImpersonating && impersonatedTenant
    ? impersonatedTenant.id
    : authTenantId;

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
  }), [effectiveTenantId, tenantIds, isSuperAdmin, isImpersonating, setCurrentTenant]);

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
