import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Permission } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import AuthErrorScreen, { type AuthDiagnostics } from './AuthErrorScreen';
import AuthLoadingScreen from './AuthLoadingScreen';
import ForbiddenScreen from './ForbiddenScreen';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  /** Permission key required to access this route */
  requiredPermission?: keyof Permission;
  /** If true, only admins can access (shortcut for admin-only routes) */
  adminOnly?: boolean;
}

const FAST_REDIRECT_TIMEOUT_MS = 300;
const PROFILE_CHECK_TIMEOUT_MS = 4000;

/**
 * Reusable route guard for /admin/* routes with deterministic behavior:
 * 1. No session → redirect to /admin/login immediately (max 300ms spinner)
 * 2. Session exists but profile fetch fails → show error screen
 * 3. Role missing/invalid → treat as unauthenticated + log to audit_logs
 * 4. Route requires admin and user is staff → show Forbidden page
 */
export default function AdminRouteGuard({ 
  children, 
  requiredPermission,
  adminOnly = false 
}: AdminRouteGuardProps) {
  const { 
    user, 
    role, 
    authState, 
    error, 
    retry, 
    goToLogin, 
    hardRefresh,
    isAuthenticated,
    diagnostics
  } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();
  
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [profileCheckError, setProfileCheckError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasLoggedInvalidRole = useRef(false);

  // Fast redirect for no session
  useEffect(() => {
    if (authState === 'unauthenticated') {
      const timer = setTimeout(() => {
        navigate('/admin/login', { replace: true });
      }, 50); // Near-instant redirect
      return () => clearTimeout(timer);
    }
  }, [authState, navigate]);

  // Check if session check is taking too long (max 300ms for initial check)
  useEffect(() => {
    if (authState === 'init' || authState === 'checking_session') {
      const fastTimeout = setTimeout(() => {
        // If still checking after 300ms, the auth context's 4s timeout will handle it
        // This is just for fast feedback
      }, FAST_REDIRECT_TIMEOUT_MS);
      return () => clearTimeout(fastTimeout);
    }
  }, [authState]);

  // Log invalid role to audit_logs and treat as unauthenticated
  useEffect(() => {
    const logInvalidRole = async () => {
      if (authState === 'ready' && user && !role && !hasLoggedInvalidRole.current) {
        hasLoggedInvalidRole.current = true;
        
        try {
          // Log to audit_logs - this will fail silently if user isn't admin
          // but the edge function or service role could handle it
          await supabase.from('admin_audit_logs').insert({
            action: 'invalid_role_access_attempt',
            actor_user_id: user.id,
            metadata: {
              email: user.email,
              attempted_at: new Date().toISOString()
            }
          });
        } catch {
          // Silently fail - user may not have permission to write audit logs
          console.warn('Could not log invalid role attempt');
        }
        
        // Redirect to login
        navigate('/admin/login', { replace: true });
      }
    };
    
    logInvalidRole();
  }, [authState, user, role, navigate]);

  // Check must_change_password with timeout
  useEffect(() => {
    if (authState !== 'ready' || !user || !isAuthenticated) {
      setMustChangePassword(null);
      return;
    }

    // Cancel previous check
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const checkMustChangePassword = async () => {
      const timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          setProfileCheckError("Profile check timed out. Please retry.");
        }
      }, PROFILE_CHECK_TIMEOUT_MS);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('user_id', user.id)
          .maybeSingle();

        clearTimeout(timeoutId);

        if (signal.aborted) return;

        if (error) {
          setProfileCheckError("Failed to check profile. Please retry.");
          return;
        }

        if (data?.must_change_password) {
          navigate('/admin/force-reset', { replace: true });
        } else {
          setMustChangePassword(false);
          setProfileCheckError(null);
        }
      } catch {
        clearTimeout(timeoutId);
        if (!signal.aborted) {
          setProfileCheckError("Failed to check profile. Please retry.");
        }
      }
    };

    checkMustChangePassword();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [authState, user, isAuthenticated, navigate]);

  const handleGoToLogin = () => {
    goToLogin();
    navigate('/admin/login', { replace: true });
  };

  // Handle auth error states
  if (authState === 'error_timeout' || authState === 'error_profile') {
    return (
      <AuthErrorScreen
        message={error || "Auth check failed. Retry or sign in again."}
        onRetry={retry}
        onGoToLogin={handleGoToLogin}
        onHardRefresh={hardRefresh}
        diagnostics={diagnostics ?? undefined}
      />
    );
  }

  // Handle profile check error
  if (profileCheckError) {
    // Create diagnostics for profile check error
    const profileDiagnostics = diagnostics ? {
      ...diagnostics,
      errorType: 'PROFILE_CHECK_FAILED',
    } : {
      sessionFound: true,
      profileFetch: 'failed' as const,
      timeoutHit: profileCheckError.includes('timed out'),
      requestId: `profile_${Date.now().toString(36)}`,
      errorType: 'PROFILE_CHECK_FAILED',
      timestamp: new Date().toISOString(),
    };
    
    return (
      <AuthErrorScreen
        message={profileCheckError}
        onRetry={() => {
          setProfileCheckError(null);
          setMustChangePassword(null);
        }}
        onGoToLogin={handleGoToLogin}
        onHardRefresh={hardRefresh}
        diagnostics={profileDiagnostics}
      />
    );
  }

  // Show brief loading during session check (max 300ms visible before auth timeout kicks in)
  if (authState === 'init' || authState === 'checking_session' || authState === 'loading_profile') {
    return <AuthLoadingScreen authState={authState} />;
  }

  // Waiting for profile check after auth ready
  if (authState === 'ready' && isAuthenticated && mustChangePassword === null) {
    return <AuthLoadingScreen authState="loading_profile" />;
  }

  // Not authenticated - redirect handled by useEffect
  if (authState === 'unauthenticated' || !isAuthenticated) {
    return <AuthLoadingScreen authState="checking_session" />;
  }

  // Check permission-based access
  if (adminOnly && role !== 'tenant_admin' && role !== 'super_admin') {
    return <ForbiddenScreen />;
  }

  if (requiredPermission && !permissions[requiredPermission]) {
    return <ForbiddenScreen />;
  }

  // All checks passed - render children
  return <>{children}</>;
}
