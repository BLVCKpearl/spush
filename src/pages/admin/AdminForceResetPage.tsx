import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AuthErrorScreen from '@/components/auth/AuthErrorScreen';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';

const PROFILE_CHECK_TIMEOUT_MS = 4000;

export default function AdminForceResetPage() {
  const { 
    user, 
    authState, 
    error, 
    retry, 
    goToLogin, 
    hardRefresh,
    isAuthenticated 
  } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mustReset, setMustReset] = useState<boolean | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check if user must reset password with timeout
  useEffect(() => {
    if (authState !== 'ready' || !user) {
      return;
    }

    // Cancel previous check
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const checkMustReset = async () => {
      const timeoutId = setTimeout(() => {
        if (!signal.aborted) {
          setProfileError("Profile check timed out. Please retry.");
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
          setProfileError("Failed to check profile. Please retry.");
          return;
        }

        if (data?.must_change_password) {
          setMustReset(true);
          setProfileError(null);
        } else {
          // User doesn't need to reset, redirect to dashboard
          navigate('/admin/orders');
        }
      } catch {
        clearTimeout(timeoutId);
        if (!signal.aborted) {
          setProfileError("Failed to check profile. Please retry.");
        }
      }
    };

    checkMustReset();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [authState, user, navigate]);

  const handleGoToLogin = () => {
    goToLogin();
    navigate('/admin/login');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      // Update password
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        toast.error(authError.message || 'Failed to update password');
        return;
      }

      // Clear the must_change_password flag
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user!.id);

      if (profileError) {
        toast.error('Failed to update profile');
        return;
      }

      toast.success('Password updated successfully');
      navigate('/admin/orders');
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle auth error states
  if (authState === 'error_timeout' || authState === 'error_profile') {
    return (
      <AuthErrorScreen
        message={error || "Auth check failed. Retry or sign in again."}
        onRetry={retry}
        onGoToLogin={handleGoToLogin}
        onHardRefresh={hardRefresh}
      />
    );
  }

  // Handle profile check error
  if (profileError) {
    return (
      <AuthErrorScreen
        message={profileError}
        onRetry={() => {
          setProfileError(null);
          setMustReset(null);
        }}
        onGoToLogin={handleGoToLogin}
        onHardRefresh={hardRefresh}
      />
    );
  }

  // Loading states
  if (authState === 'init' || authState === 'checking_session' || authState === 'loading_profile') {
    return <AuthLoadingScreen authState={authState} />;
  }

  // Not authenticated
  if (authState === 'unauthenticated' || !isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  // Checking must_reset
  if (mustReset === null) {
    return <AuthLoadingScreen authState="loading_profile" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Password Reset Required</CardTitle>
          <CardDescription>
            Your administrator has requested that you change your password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Set New Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
