import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminForceResetPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mustReset, setMustReset] = useState<boolean | null>(null);

  // Check if user must reset password
  useEffect(() => {
    async function checkMustReset() {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('user_id', user.id)
        .single();

      if (data?.must_change_password) {
        setMustReset(true);
      } else {
        // User doesn't need to reset, redirect to dashboard
        navigate('/admin/orders');
      }
    }

    if (!loading && user) {
      checkMustReset();
    } else if (!loading && !user) {
      navigate('/admin/login');
    }
  }, [user, loading, navigate]);

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

  if (loading || mustReset === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
