import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

interface ImpersonatedTenant {
  id: string;
  name: string;
  venue_slug: string;
}

interface ImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedTenant: ImpersonatedTenant | null;
  startImpersonation: (tenant: ImpersonatedTenant) => void;
  stopImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedTenant, setImpersonatedTenant] = useState<ImpersonatedTenant | null>(() => {
    // Restore from sessionStorage on mount
    const stored = sessionStorage.getItem('impersonated_tenant');
    return stored ? JSON.parse(stored) : null;
  });

  const startImpersonation = useCallback((tenant: ImpersonatedTenant) => {
    setImpersonatedTenant(tenant);
    sessionStorage.setItem('impersonated_tenant', JSON.stringify(tenant));
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonatedTenant(null);
    sessionStorage.removeItem('impersonated_tenant');
  }, []);

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
