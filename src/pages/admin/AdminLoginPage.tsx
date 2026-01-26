import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { signIn, signOut, user, isAdmin, isStaff, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown) => {
    if (!err) return null;
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (typeof err === 'object' && 'message' in (err as any)) {
      const msg = (err as any).message;
      if (typeof msg === 'string') return msg;
    }
    try {
      return JSON.stringify(err);
    } catch {
      return 'An unknown error occurred.';
    }
  };

  // Redirect if already logged in with a valid role
  useEffect(() => {
    if (!loading && user && (isAdmin || isStaff)) {
      navigate('/admin/orders');
    }
  }, [loading, user, isAdmin, isStaff, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // If we somehow have a stale session, clear it before trying again.
      if (user) {
        await signOut().catch(() => {});
      }

      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(getErrorMessage(signInError) ?? 'Login failed.');

        // Ensure the user always lands back on the login page after an unsuccessful attempt.
        navigate('/admin/login', { replace: true });
        return;
      }

      // The useEffect above will handle navigation once role is loaded
      toast.success('Login successful!');
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut().catch(() => {});
    navigate('/admin/login', { replace: true });
    // Hard reset to clear any cached state/listeners.
    window.location.reload();
  };

  // If user is logged in but has no role, show access denied with option to sign out
  if (user && !isAdmin && !isStaff) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              Your account does not have admin or staff privileges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please contact an administrator to request access.
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignOut}
            >
              Sign out and try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Staff Login</CardTitle>
          <CardDescription>
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
