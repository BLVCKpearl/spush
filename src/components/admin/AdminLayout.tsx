import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import AuthErrorScreen from '@/components/auth/AuthErrorScreen';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';
import { 
  ClipboardList, 
  UtensilsCrossed, 
  CreditCard,
  BarChart3,
  Users,
  QrCode,
  LogOut,
  UserCircle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission: keyof ReturnType<typeof usePermissions>;
}

const navItems: NavItem[] = [
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, permission: 'canAccessOrders' },
  { to: '/admin/tables', label: 'Tables', icon: QrCode, permission: 'canManageTables' },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'canAccessAnalytics' },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, permission: 'canManageMenu' },
  { to: '/admin/bank-details', label: 'Bank Details', icon: CreditCard, permission: 'canManageBankDetails' },
  { to: '/admin/users', label: 'Users', icon: Users, permission: 'canManageUsers' },
  { to: '/admin/account', label: 'Account', icon: UserCircle, permission: 'canModifyOwnPassword' },
];

const PROFILE_CHECK_TIMEOUT_MS = 4000;

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { 
    user, 
    role, 
    loading, 
    signOut, 
    isAuthenticated, 
    authState, 
    error, 
    retry, 
    goToLogin, 
    hardRefresh 
  } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [profileCheckError, setProfileCheckError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Check if user must change password with timeout
  useEffect(() => {
    if (authState !== 'ready' || !user) {
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
          navigate('/admin/force-reset');
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
  }, [authState, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleGoToLogin = () => {
    goToLogin();
    navigate('/admin/login');
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
  if (profileCheckError) {
    return (
      <AuthErrorScreen
        message={profileCheckError}
        onRetry={() => {
          setProfileCheckError(null);
          setMustChangePassword(null);
        }}
        onGoToLogin={handleGoToLogin}
        onHardRefresh={hardRefresh}
      />
    );
  }

  // Show loading state (never more than 4s due to timeouts in AuthContext)
  if (loading) {
    return <AuthLoadingScreen authState={authState} />;
  }

  // Waiting for profile check after auth ready
  if (authState === 'ready' && isAuthenticated && mustChangePassword === null) {
    return <AuthLoadingScreen authState="loading_profile" />;
  }

  // Redirect to login if not authenticated
  if (authState === 'unauthenticated' || !isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => permissions[item.permission]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold hidden sm:block">Restaurant Admin</h1>
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
              {role}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <nav className="flex border-t overflow-x-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Page Content */}
      <main className="p-4">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        {children}
      </main>
    </div>
  );
}
