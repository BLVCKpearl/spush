import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

    // Safety timeout - never let auth loading hang forever
    const safetyTimeout = window.setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        initialLoadDone = true;
        setLoading(false);
      }
    }, 3000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) return;
        initialLoadDone = true;

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
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (!isMounted) return;
      initialLoadDone = true;

      setSession(existing);
      setUser(existing?.user ?? null);

      if (existing?.user) {
        try {
          const existingRole = await fetchUserRole(existing.user.id);
          if (isMounted) setRole(existingRole);
        } catch {
          if (isMounted) setRole(null);
        }
      }

      if (isMounted) setLoading(false);
    }).catch(() => {
      if (isMounted) {
        initialLoadDone = true;
        setLoading(false);
      }
    });

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
    setUser(null);
    setSession(null);
    setRole(null);
    try {
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

// Backwards compatibility alias
export const useAuthContext = useAuth;
