import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AuthDiagnostics } from "@/components/auth/AuthErrorScreen";

export type UserRole = "admin" | "staff" | null;

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
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  authState: AuthState;
  error: string | null;
  diagnostics: AuthDiagnostics | null;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: unknown | null }>;
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

// Helper to fetch role with timeout
async function fetchUserRoleWithTimeout(
  userId: string,
  signal: AbortSignal
): Promise<UserRole> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      reject(new Error("Profile fetch timeout"));
    }, PROFILE_TIMEOUT_MS);
    signal.addEventListener("abort", () => clearTimeout(id));
  });

  const fetchPromise = (async () => {
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (signal.aborted) throw new Error("Aborted");
    if (error) throw error;

    if (!roles || roles.length === 0) return null;
    if (roles.some((r) => r.role === "admin")) return "admin";
    if (roles.some((r) => r.role === "staff")) return "staff";
    return null;
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

  // Main auth check flow
  const checkAuth = useCallback(async (isAutoRetry = false) => {
    const requestId = generateRequestId();
    const startTime = new Date().toISOString();
    
    // Initialize diagnostics for this request
    const currentDiagnostics: AuthDiagnostics = {
      sessionFound: false,
      profileFetch: 'pending',
      timeoutHit: false,
      requestId,
      timestamp: startTime,
    };

    // Prevent too many auto retries
    if (isAutoRetry && autoRetryCount >= MAX_AUTO_RETRIES) {
      currentDiagnostics.timeoutHit = true;
      currentDiagnostics.errorType = 'MAX_RETRIES_EXCEEDED';
      setDiagnostics(currentDiagnostics);
      setAuthState("error_timeout");
      setError("Auth check failed after retry. Please try again manually.");
      
      // Log to audit
      logAuthFailure('AUTH_MAX_RETRIES_EXCEEDED', null, {
        requestId,
        retryCount: autoRetryCount,
      });
      return;
    }

    const signal = cancelPendingOperations();

    try {
      // State: checking_session
      setAuthState("checking_session");
      setError(null);
      setDiagnostics(currentDiagnostics);

      const currentSession = await getSessionWithTimeout(signal);

      if (signal.aborted) return;

      if (!currentSession?.user) {
        // No session - unauthenticated
        currentDiagnostics.sessionFound = false;
        currentDiagnostics.profileFetch = 'skipped';
        setDiagnostics(currentDiagnostics);
        setSession(null);
        setUser(null);
        setRole(null);
        setAuthState("unauthenticated");
        setAutoRetryCount(0);
        return;
      }

      // Has session - authenticated, now load profile
      currentDiagnostics.sessionFound = true;
      setDiagnostics(currentDiagnostics);
      setSession(currentSession);
      setUser(currentSession.user);
      setAuthState("loading_profile");

      try {
        const userRole = await fetchUserRoleWithTimeout(currentSession.user.id, signal);

        if (signal.aborted) return;

        currentDiagnostics.profileFetch = 'ok';
        setDiagnostics(currentDiagnostics);
        setRole(userRole);
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
        
        // Log to audit
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

      // Auto-retry once
      if (!isAutoRetry && autoRetryCount < MAX_AUTO_RETRIES) {
        setAutoRetryCount((c) => c + 1);
        checkAuth(true);
        return;
      }

      setAuthState("error_timeout");
      setError("Auth check failed. Please retry or sign in again.");
      
      // Log to audit
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

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        // Only react to sign in/out events, not token refreshes
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          if (event === "SIGNED_OUT") {
            setSession(null);
            setUser(null);
            setRole(null);
            setAuthState("unauthenticated");
            setAutoRetryCount(0);
            setDiagnostics(null);
          } else {
            // Re-check auth on sign in
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

  // Retry handler (user-initiated)
  const retry = useCallback(() => {
    setAutoRetryCount(0);
    checkAuth();
  }, [checkAuth]);

  // Go to login handler
  const goToLogin = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setAuthState("unauthenticated");
    setAutoRetryCount(0);
    setDiagnostics(null);
  }, []);

  // Hard refresh handler
  const hardRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // Trigger re-check
      checkAuth();
    }
    return { error: error ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return { error: error ?? null };
  };

  const signOut: AuthContextValue["signOut"] = async () => {
    cancelPendingOperations();
    setUser(null);
    setSession(null);
    setRole(null);
    setAuthState("unauthenticated");
    setAutoRetryCount(0);
    setDiagnostics(null);
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Ignore sign out errors
    }
    return { error: null };
  };

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = role === "admin";
    const isStaff = role === "staff";
    const isAuthenticated = !!user && (isAdmin || isStaff);
    const loading = authState === "init" || authState === "checking_session" || authState === "loading_profile";

    return {
      user,
      session,
      role,
      isAdmin,
      isStaff,
      isAuthenticated,
      loading,
      authState,
      error,
      diagnostics,
      signIn,
      signUp,
      signOut,
      retry,
      goToLogin,
      hardRefresh,
    };
  }, [user, session, role, authState, error, diagnostics, retry, goToLogin, hardRefresh]);

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
