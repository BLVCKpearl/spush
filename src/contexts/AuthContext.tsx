import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | null;

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: unknown | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!roles || roles.length === 0) return null;
  if (roles.some((r) => r.role === "admin")) return "admin";
  if (roles.some((r) => r.role === "staff")) return "staff";
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;
    
    // Safety timeout to force loading to resolve after 3 seconds max
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        console.warn('[Auth] Safety timeout triggered - forcing loading=false');
        setLoading(false);
        initialLoadDone = true;
      }
    }, 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        try {
          if (!isMounted) return;
          if (initialLoadDone) return; // Prevent duplicate processing
          
          setSession(nextSession);
          setUser(nextSession?.user ?? null);

          if (nextSession?.user) {
            try {
              const nextRole = await fetchUserRole(nextSession.user.id);
              if (isMounted) setRole(nextRole);
            } catch {
              if (isMounted) setRole(null);
            }
          } else {
            setRole(null);
          }

          if (isMounted) setLoading(false);
          initialLoadDone = true;
        } catch (error) {
          console.error('[Auth] Error in auth state change handler:', error);
          // Still mark as done and stop loading even if there's an error
          if (isMounted) {
            setLoading(false);
            initialLoadDone = true;
          }
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    // Always clear local state immediately so the UI responds even if the server session is stale.
    setUser(null);
    setSession(null);
    setRole(null);

    try {
      // If the session is already gone server-side, this may return 403 session_not_found.
      // That's fine—our client is already logged out.
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Ignore
    }

    return { error: null };
  };

  const value = useMemo<AuthContextValue>(() => {
    const isAdmin = role === "admin";
    const isStaff = role === "staff";
    const isAuthenticated = !!user && (isAdmin || isStaff);

    return {
      user,
      session,
      role,
      isAdmin,
      isStaff,
      isAuthenticated,
      loading,
      signIn,
      signUp,
      signOut,
    };
  }, [user, session, role, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
