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
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signUp: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: unknown | null }>;
  clearMustChangePassword: () => void;
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

async function fetchMustChangePassword(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.must_change_password ?? false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!isMounted) return;
        
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (nextSession?.user) {
          try {
            const [nextRole, mustChange] = await Promise.all([
              fetchUserRole(nextSession.user.id),
              fetchMustChangePassword(nextSession.user.id),
            ]);
            if (isMounted) {
              setRole(nextRole);
              setMustChangePassword(mustChange);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
            if (isMounted) {
              setRole(null);
              setMustChangePassword(false);
            }
          }
        } else {
          setRole(null);
          setMustChangePassword(false);
        }

        if (isMounted) setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (!isMounted) return;
      
      setSession(existing);
      setUser(existing?.user ?? null);

      if (existing?.user) {
        try {
          const [existingRole, mustChange] = await Promise.all([
            fetchUserRole(existing.user.id),
            fetchMustChangePassword(existing.user.id),
          ]);
          if (isMounted) {
            setRole(existingRole);
            setMustChangePassword(mustChange);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (isMounted) {
            setRole(null);
            setMustChangePassword(false);
          }
        }
      } else {
        setRole(null);
        setMustChangePassword(false);
      }

      if (isMounted) setLoading(false);
    }).catch((error) => {
      console.error("Error getting session:", error);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
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
    setMustChangePassword(false);

    try {
      // If the session is already gone server-side, this may return 403 session_not_found.
      // That's fine—our client is already logged out.
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // Ignore
    }

    return { error: null };
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
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
      mustChangePassword,
      signIn,
      signUp,
      signOut,
      clearMustChangePassword,
    };
  }, [user, session, role, loading, mustChangePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
