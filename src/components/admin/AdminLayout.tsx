import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UtensilsCrossed, 
  CreditCard,
  BarChart3,
  Users,
  LogOut,
  Loader2,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/tables', label: 'Tables', icon: QrCode, adminOnly: true },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, adminOnly: true },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, adminOnly: true },
  { to: '/admin/bank-details', label: 'Bank Details', icon: CreditCard, adminOnly: true },
  { to: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  const { user, isAdmin, isStaff, loading, signOut } = auth;
  const isAuthorized = !!user && (isAdmin || isStaff);

  useEffect(() => {
    if (!loading && !isAuthorized) {
      navigate('/admin/login');
    }
  }, [loading, isAuthorized, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      // Ignore errors - we'll navigate anyway
    }
    toast.success('Signed out successfully');
    navigate('/admin/login');
  };

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item => 
    !item.adminOnly || isAdmin
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="font-semibold hidden sm:block">Restaurant Admin</h1>
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
              {isAdmin ? 'Admin' : 'Staff'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:block">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
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
