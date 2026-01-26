import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface TenantContextValue {
  /** Current tenant ID - null for super admins when viewing globally */
  tenantId: string | null;
  /** All tenant IDs the user has access to */
  tenantIds: string[];
  /** Whether the user is a super admin (can access all tenants) */
  isSuperAdmin: boolean;
  /** Whether tenant context is required for data access */
  requiresTenantScope: boolean;
  /** Check if user has access to a specific tenant */
  hasAccessToTenant: (tenantId: string) => boolean;
  /** Set the current tenant (for super admins switching between tenants) */
  setCurrentTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenantId, tenantIds, isSuperAdmin, setCurrentTenant } = useAuth();

  const value = useMemo<TenantContextValue>(() => ({
    tenantId,
    tenantIds,
    isSuperAdmin,
    // Super admins don't require tenant scope when viewing globally
    requiresTenantScope: !isSuperAdmin,
    hasAccessToTenant: (id: string) => {
      if (isSuperAdmin) return true;
      return tenantIds.includes(id);
    },
    setCurrentTenant,
  }), [tenantId, tenantIds, isSuperAdmin, setCurrentTenant]);

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
  const { tenantId, isSuperAdmin } = useTenant();
  
  // Super admins can view all data when no tenant is selected
  if (isSuperAdmin && !tenantId) {
    return undefined;
  }
  
  return tenantId ?? undefined;
}
