import { NavLink, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import AdminRouteGuard from '@/components/auth/AdminRouteGuard';
import type { Permission } from '@/hooks/usePermissions';
import { 
  ClipboardList, 
  UtensilsCrossed, 
  CreditCard,
  BarChart3,
  Users,
  QrCode,
  LogOut,
  UserCircle,
  Shield,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  /** Permission key required to access this page */
  requiredPermission?: keyof Permission;
  /** If true, only admins can access */
  adminOnly?: boolean;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  permission: keyof Permission;
}

const navItems: NavItem[] = [
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList, permission: 'canAccessOrders' },
  { to: '/admin/tables', label: 'Tables', icon: QrCode, permission: 'canManageTables' },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'canAccessAnalytics' },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, permission: 'canManageMenu' },
  { to: '/admin/bank-details', label: 'Bank Details', icon: CreditCard, permission: 'canManageBankDetails' },
  { to: '/admin/users', label: 'Users', icon: Users, permission: 'canManageUsers' },
  { to: '/admin/account', label: 'Account', icon: UserCircle, permission: 'canModifyOwnPassword' },
  { to: '/admin/auth-test', label: 'Auth Test', icon: Shield, permission: 'canManageUsers' },
];

export default function AdminLayout({ 
  children, 
  title,
  requiredPermission,
  adminOnly = false
}: AdminLayoutProps) {
  const { user, role, signOut } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => permissions[item.permission]);

  return (
    <AdminRouteGuard requiredPermission={requiredPermission} adminOnly={adminOnly}>
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
    </AdminRouteGuard>
  );
}
