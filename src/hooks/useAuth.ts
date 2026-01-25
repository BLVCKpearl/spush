import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'staff' | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (!roles || roles.length === 0) return null;
    
    // Prioritize admin role if user has multiple roles
    if (roles.some(r => r.role === 'admin')) return 'admin';
    if (roles.some(r => r.role === 'staff')) return 'staff';
    return null;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userRole = await fetchUserRole(session.user.id);
          setRole(userRole);
        } else {
          setRole(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then((userRole) => {
          setRole(userRole);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  // Computed properties for backward compatibility and convenience
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
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
}

export function useRequireAuth(requiredRole?: 'admin' | 'staff' | 'any') {
  const { user, role, isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/admin/login');
      return;
    }

    // Check role requirements
    const hasAccess = 
      requiredRole === 'any' ? (isAdmin || isStaff) :
      requiredRole === 'admin' ? isAdmin :
      requiredRole === 'staff' ? (isAdmin || isStaff) : // Admin can do staff things too
      (isAdmin || isStaff); // Default: any authenticated staff/admin

    if (!hasAccess) {
      navigate('/admin/login');
    }
  }, [user, role, isAdmin, isStaff, loading, navigate, requiredRole]);

  return { user, role, isAdmin, isStaff, loading };
}
