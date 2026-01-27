import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface ImpersonatedTenant {
  id: string;
  name: string;
  venue_slug: string;
}

interface ImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedTenant: ImpersonatedTenant | null;
  startImpersonation: (tenant: ImpersonatedTenant) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

// Log impersonation events to audit_logs
async function logImpersonationEvent(
  actorUserId: string,
  action: 'impersonation_start' | 'impersonation_end',
  tenantId: string,
  tenantName: string
): Promise<void> {
  try {
    await supabase.from('admin_audit_logs').insert({
      action,
      actor_user_id: actorUserId,
      tenant_id: tenantId,
      metadata: {
        tenant_name: tenantName,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Log failures shouldn't block impersonation
    console.warn('Failed to log impersonation event:', err);
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = useAuth();
  
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(() => {
    // Restore from sessionStorage on mount
    const stored = sessionStorage.getItem('impersonated_tenant');
    return stored ? JSON.parse(stored) : null;
  });

  const startImpersonation = useCallback(async (tenant: ImpersonatedTenant) => {
    if (!user || !isSuperAdmin) {
      console.warn('Only super admins can impersonate tenants');
      return;
    }

    // Log impersonation start
    await logImpersonationEvent(user.id, 'impersonation_start', tenant.id, tenant.name);
    
    setImpersonatedTenant(tenant);
    sessionStorage.setItem('impersonated_tenant', JSON.stringify(tenant));
  }, [user, isSuperAdmin]);

  const stopImpersonation = useCallback(async () => {
    if (!user || !impersonatedTenant) {
      setImpersonatedTenant(null);
      sessionStorage.removeItem('impersonated_tenant');
      return;
    }

    // Log impersonation end
    await logImpersonationEvent(user.id, 'impersonation_end', impersonatedTenant.id, impersonatedTenant.name);
    
    setImpersonatedTenant(null);
    sessionStorage.removeItem('impersonated_tenant');
  }, [user, impersonatedTenant]);

  const value = useMemo<ImpersonationContextValue>(() => ({
    isImpersonating: !!impersonatedTenant,
    impersonatedTenant,
    startImpersonation,
    stopImpersonation,
  }), [impersonatedTenant, startImpersonation, stopImpersonation]);

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) {
    throw new Error('useImpersonation must be used within <ImpersonationProvider>');
  }
  return ctx;
}
