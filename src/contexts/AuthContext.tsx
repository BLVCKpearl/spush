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
  // No auth required - start with loading=false
  const [loading] = useState(false);

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
