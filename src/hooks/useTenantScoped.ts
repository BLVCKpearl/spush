import { useTenant } from '@/contexts/TenantContext';

/**
 * Hook to get the current tenant ID for scoping queries
 * Throws if tenant scope is required but not available
 */
export function useTenantId(): string {
  const { tenantId, requiresTenantScope } = useTenant();
  
  if (requiresTenantScope && !tenantId) {
    throw new Error('Tenant context is required but not available');
  }
  
  // For super admins, return first tenant or throw if none
  if (!tenantId) {
    throw new Error('No tenant selected');
  }
  
  return tenantId;
}

/**
 * Hook to get optional tenant ID for queries that can work globally
 */
export function useOptionalTenantId(): string | null {
  const { tenantId } = useTenant();
  return tenantId;
}

/**
 * Hook to check if user can access a specific tenant's data
 */
export function useCanAccessTenant(targetTenantId: string | null | undefined): boolean {
  const { hasAccessToTenant, isSuperAdmin } = useTenant();
  
  if (!targetTenantId) return false;
  if (isSuperAdmin) return true;
  
  return hasAccessToTenant(targetTenantId);
}

/**
 * Hook to validate tenant access and throw if unauthorized
 */
export function useRequireTenantAccess(targetTenantId: string | null | undefined): void {
  const canAccess = useCanAccessTenant(targetTenantId);
  
  if (targetTenantId && !canAccess) {
    throw new Error('Access denied: You do not have permission to access this tenant\'s data');
  }
}

/**
 * Hook to validate and get a safe tenant ID for mutations
 * During impersonation, returns the impersonated tenant ID
 * Validates cross-tenant mutations are rejected
 */
export function useSafeTenantMutation() {
  const { tenantId, validateTenantMutation, logImpersonationAction, isImpersonating } = useTenant();
  
  return {
    /** The current effective tenant ID */
    tenantId,
    
    /** Validate that a mutation targets the correct tenant */
    validateMutation: (targetTenantId: string | null | undefined) => {
      validateTenantMutation(targetTenantId);
    },
    
    /** Log an action for audit purposes (only logs during impersonation) */
    logAction: async (action: string, metadata?: Record<string, unknown>) => {
      if (isImpersonating) {
        await logImpersonationAction(action, metadata);
      }
    },
  };
}
