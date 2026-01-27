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
  returnUrl: string | null;
  startImpersonation: (tenant: ImpersonatedTenant, returnUrl?: string) => Promise<void>;
  stopImpersonation: () => Promise<string | null>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

const IMPERSONATED_TENANT_KEY = 'impersonated_tenant';
const IMPERSONATION_RETURN_URL_KEY = 'impersonation_return_url';

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
    const stored = sessionStorage.getItem(IMPERSONATED_TENANT_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  const [returnUrl, setReturnUrl] = useState<string | null>(() => {
    return sessionStorage.getItem(IMPERSONATION_RETURN_URL_KEY);
  });

  const startImpersonation = useCallback(async (tenant: ImpersonatedTenant, customReturnUrl?: string) => {
    if (!user || !isSuperAdmin) {
      console.warn('Only super admins can impersonate tenants');
      return;
    }

    // Store the return URL (current page or custom)
    const urlToStore = customReturnUrl || window.location.pathname;
    setReturnUrl(urlToStore);
    sessionStorage.setItem(IMPERSONATION_RETURN_URL_KEY, urlToStore);

    // Log impersonation start
    await logImpersonationEvent(user.id, 'impersonation_start', tenant.id, tenant.name);
    
    setImpersonatedTenant(tenant);
    sessionStorage.setItem(IMPERSONATED_TENANT_KEY, JSON.stringify(tenant));
  }, [user, isSuperAdmin]);

  const stopImpersonation = useCallback(async (): Promise<string | null> => {
    const storedReturnUrl = sessionStorage.getItem(IMPERSONATION_RETURN_URL_KEY);
    
    if (user && impersonatedTenant) {
      // Log impersonation end
      await logImpersonationEvent(user.id, 'impersonation_end', impersonatedTenant.id, impersonatedTenant.name);
    }
    
    setImpersonatedTenant(null);
    setReturnUrl(null);
    sessionStorage.removeItem(IMPERSONATED_TENANT_KEY);
    sessionStorage.removeItem(IMPERSONATION_RETURN_URL_KEY);

    // Return the stored URL so the caller can navigate
    return storedReturnUrl;
  }, [user, impersonatedTenant]);

  const value = useMemo<ImpersonationContextValue>(() => ({
    isImpersonating: !!impersonatedTenant,
    impersonatedTenant,
    returnUrl,
    startImpersonation,
    stopImpersonation,
  }), [impersonatedTenant, returnUrl, startImpersonation, stopImpersonation]);

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
