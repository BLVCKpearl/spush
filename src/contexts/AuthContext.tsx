import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AuthDiagnostics } from "@/components/auth/AuthErrorScreen";
import { isNonProduction } from "@/lib/environment";

export type UserRole = "super_admin" | "tenant_admin" | "staff" | null;

// Explicit auth state machine
export type AuthState =
  | "init"
  | "checking_session"
  | "unauthenticated"
  | "authenticated"
  | "loading_profile"
  | "ready"
  | "error_profile"
  | "error_timeout";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole;
  tenantId: string | null; // Current tenant context
  tenantIds: string[]; // All tenants user has access to
  isSuperAdmin: boolean;
  isTenantAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  authState: AuthState;
  error: string | null;
  diagnostics: AuthDiagnostics | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string, businessName?: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: unknown | null }>;
  setCurrentTenant: (tenantId: string) => void;
  retry: () => void;
  goToLogin: () => void;
  hardRefresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Timeout constants
const SESSION_TIMEOUT_MS = 4000;
const PROFILE_TIMEOUT_MS = 4000;
const MAX_AUTO_RETRIES = 1;

// Generate a unique request ID for debugging
function generateRequestId(): string {
  return `auth_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// Log auth failure to audit_logs (best effort, don't block on failure)
async function logAuthFailure(
  action: string,
  userId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from("admin_audit_logs").insert({
      action,
      actor_user_id: userId || "00000000-0000-0000-0000-000000000000",
      metadata: {
        ...metadata,
        client_timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
    });
  } catch (err) {
    // Silently fail - don't block auth flow for audit logging
    console.warn("Failed to log auth failure:", err);
  }
}

// Check if profile failure simulation is active (non-prod only)
function shouldSimulateProfileFailure(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isNonProduction()) return false;
  return localStorage.getItem('auth_test_simulate_profile_failure') === 'true';
}

interface RoleInfo {
  role: UserRole;
  tenantIds: string[];
}

// Helper to fetch role with timeout - new multi-tenant aware version
async function fetchUserRoleWithTimeout(
  userId: string,
  signal: AbortSignal
): Promise<RoleInfo> {
  // Check for simulation flag (non-prod only)
  if (shouldSimulateProfileFailure()) {
    localStorage.removeItem('auth_test_simulate_profile_failure');
    throw new Error("Simulated profile fetch failure for testing");
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      reject(new Error("Profile fetch timeout"));
    }, PROFILE_TIMEOUT_MS);
    signal.addEventListener("abort", () => clearTimeout(id));
  });

  const fetchPromise = (async (): Promise<RoleInfo> => {
    // First check if user is a super admin
    const { data: superAdmin, error: superAdminError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (signal.aborted) throw new Error("Aborted");
    
    if (superAdminError) {
      console.error("Error checking super admin:", superAdminError);
    }

    if (superAdmin) {
      // Super admin - has access to all tenants
      return { role: "super_admin", tenantIds: [] };
    }

    // Check tenant roles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("tenant_role, tenant_id")
      .eq("user_id", userId)
      .not("tenant_role", "is", null);

    if (signal.aborted) throw new Error("Aborted");
    if (error) throw error;

    if (!roles || roles.length === 0) {
      // Fallback: check legacy roles (for transition)
      const { data: legacyRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (legacyRoles && legacyRoles.length > 0) {
        // Map legacy roles: admin -> tenant_admin, staff -> staff
        if (legacyRoles.some((r) => r.role === "admin")) {
          return { role: "tenant_admin", tenantIds: [] };
        }
        if (legacyRoles.some((r) => r.role === "staff")) {
          return { role: "staff", tenantIds: [] };
        }
      }
      return { role: null, tenantIds: [] };
    }

    // Extract tenant IDs
    const tenantIds = roles
      .filter((r) => r.tenant_id)
      .map((r) => r.tenant_id as string);

    // Determine highest role
    if (roles.some((r) => r.tenant_role === "tenant_admin")) {
      return { role: "tenant_admin", tenantIds };
    }
    if (roles.some((r) => r.tenant_role === "staff")) {
      return { role: "staff", tenantIds };
    }

    return { role: null, tenantIds: [] };
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

// Helper to get session with timeout
async function getSessionWithTimeout(signal: AbortSignal): Promise<Session | null> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      reject(new Error("Session check timeout"));
    }, SESSION_TIMEOUT_MS);
    signal.addEventListener("abort", () => clearTimeout(id));
  });

  const fetchPromise = (async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (signal.aborted) throw new Error("Aborted");
    if (error) throw error;
    return session;
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantIds, setTenantIds] = useState<string[]>([]);
  const [authState, setAuthState] = useState<AuthState>("init");
  const [error, setError] = useState<string | null>(null);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostics | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancel any pending operations
  const cancelPendingOperations = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  // Set current tenant context
  const setCurrentTenant = useCallback((newTenantId: string) => {
    setTenantId(newTenantId);
    // Persist to localStorage for page refreshes
    localStorage.setItem('current_tenant_id', newTenantId);
  }, []);

  // Main auth check flow
  const checkAuth = useCallback(async (isAutoRetry = false) => {
    const requestId = generateRequestId();
    const startTime = new Date().toISOString();
    
    const currentDiagnostics: AuthDiagnostics = {
      sessionFound: false,
      profileFetch: 'pending',
      timeoutHit: false,
      requestId,
      timestamp: startTime,
    };

    if (isAutoRetry && autoRetryCount >= MAX_AUTO_RETRIES) {
      currentDiagnostics.timeoutHit = true;
      currentDiagnostics.errorType = 'MAX_RETRIES_EXCEEDED';
      setDiagnostics(currentDiagnostics);
      setAuthState("error_timeout");
      setError("Auth check failed after retry. Please try again manually.");
      
      logAuthFailure('AUTH_MAX_RETRIES_EXCEEDED', null, {
        requestId,
        retryCount: autoRetryCount,
      });
      return;
    }

    const signal = cancelPendingOperations();

    try {
      setAuthState("checking_session");
      setError(null);
      setDiagnostics(currentDiagnostics);

      const currentSession = await getSessionWithTimeout(signal);

      if (signal.aborted) return;

      if (!currentSession?.user) {
        currentDiagnostics.sessionFound = false;
        currentDiagnostics.profileFetch = 'skipped';
        setDiagnostics(currentDiagnostics);
        setSession(null);
        setUser(null);
        setRole(null);
        setTenantId(null);
        setTenantIds([]);
        setAuthState("unauthenticated");
        setAutoRetryCount(0);
        return;
      }

      currentDiagnostics.sessionFound = true;
      setDiagnostics(currentDiagnostics);
      setSession(currentSession);
      setUser(currentSession.user);
      setAuthState("loading_profile");

      try {
        const roleInfo = await fetchUserRoleWithTimeout(currentSession.user.id, signal);

        if (signal.aborted) return;

        currentDiagnostics.profileFetch = 'ok';
        setDiagnostics(currentDiagnostics);
        setRole(roleInfo.role);
        setTenantIds(roleInfo.tenantIds);
        
        // Restore tenant context from localStorage or use first available
        const savedTenantId = localStorage.getItem('current_tenant_id');
        if (savedTenantId && roleInfo.tenantIds.includes(savedTenantId)) {
          setTenantId(savedTenantId);
        } else if (roleInfo.tenantIds.length > 0) {
          setTenantId(roleInfo.tenantIds[0]);
        }
        
        setAuthState("ready");
        setAutoRetryCount(0);
      } catch (profileError) {
        if (signal.aborted) return;

        console.error("Profile fetch error:", profileError);
        
        const isTimeout = profileError instanceof Error && profileError.message.includes('timeout');
        currentDiagnostics.profileFetch = 'failed';
        currentDiagnostics.timeoutHit = isTimeout;
        currentDiagnostics.errorType = isTimeout ? 'AUTH_PROFILE_FETCH_TIMEOUT' : 'AUTH_PROFILE_FETCH_FAILED';
        setDiagnostics(currentDiagnostics);
        
        setRole(null);
        setAuthState("error_profile");
        setError("Failed to load user profile. Please retry.");
        
        logAuthFailure(currentDiagnostics.errorType, currentSession.user.id, {
          requestId,
          error: profileError instanceof Error ? profileError.message : String(profileError),
        });
      }
    } catch (err) {
      if (signal.aborted) return;

      console.error("Auth check error:", err);
      
      const isTimeout = err instanceof Error && err.message.includes('timeout');
      currentDiagnostics.timeoutHit = isTimeout;
      currentDiagnostics.errorType = isTimeout ? 'AUTH_SESSION_TIMEOUT' : 'AUTH_SESSION_CHECK_FAILED';
      currentDiagnostics.profileFetch = 'skipped';
      setDiagnostics(currentDiagnostics);

      if (!isAutoRetry && autoRetryCount < MAX_AUTO_RETRIES) {
        setAutoRetryCount((c) => c + 1);
        checkAuth(true);
        return;
      }

      setAuthState("error_timeout");
      setError("Auth check failed. Please retry or sign in again.");
      
      logAuthFailure(currentDiagnostics.errorType, null, {
        requestId,
        error: err instanceof Error ? err.message : String(err),
        retryCount: autoRetryCount,
      });
    }
  }, [cancelPendingOperations, autoRetryCount]);

  // Initial auth check on mount
  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            setRole(null);
            setTenantId(null);
            setTenantIds([]);
            setAuthState("unauthenticated");
            setAutoRetryCount(0);
            setDiagnostics(null);
            localStorage.removeItem('current_tenant_id');
          } else {
            checkAuth();
          }
        }
      }
    );

    return () => {
      cancelPendingOperations();
      subscription.unsubscribe();
    };
  }, [checkAuth, cancelPendingOperations]);

  const retry = useCallback(() => {
    setAutoRetryCount(0);
    checkAuth();
  }, [checkAuth]);

  const goToLogin = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setTenantId(null);
    setTenantIds([]);
    setAuthState("unauthenticated");
    setAutoRetryCount(0);
    setDiagnostics(null);
    localStorage.removeItem('current_tenant_id');
  }, []);

  const hardRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      checkAuth();
    }
    return { error: error ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, businessName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        emailRedirectTo: window.location.origin,
        data: businessName ? { business_name: businessName } : undefined
      },
    });
    return { error: error ?? null };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    cancelPendingOperations();
    setUser(null);
    setSession(null);
    setRole(null);
    setTenantId(null);
    setTenantIds([]);
    setAuthState("unauthenticated");
    setAutoRetryCount(0);
    setDiagnostics(null);
    localStorage.removeItem('current_tenant_id');
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Ignore sign out errors
    }
    return { error: null };
  };

  const value = useMemo<AuthContextValue>(() => {
    const isSuperAdmin = role === "super_admin";
    const isTenantAdmin = role === "tenant_admin";
    const isStaff = role === "staff";
    const isAuthenticated = !!user && (isSuperAdmin || isTenantAdmin || isStaff);
    const loading = authState === "init" || authState === "checking_session" || authState === "loading_profile";

    return {
      user,
      session,
      role,
      tenantId,
      tenantIds,
      isSuperAdmin,
      isTenantAdmin,
      isStaff,
      isAuthenticated,
      loading,
      authState,
      error,
      diagnostics,
      signIn,
      signUp,
      signOut,
      setCurrentTenant,
      retry,
      goToLogin,
      hardRefresh,
    };
  }, [user, session, role, tenantId, tenantIds, authState, error, diagnostics, setCurrentTenant, retry, goToLogin, hardRefresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

// Backwards compatibility alias
export const useAuthContext = useAuth;
