import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UtensilsCrossed, 
  CreditCard,
  BarChart3,
  Users,
  QrCode,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/tables', label: 'Tables', icon: QrCode },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/bank-details', label: 'Bank Details', icon: CreditCard },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="font-semibold hidden sm:block">Restaurant Admin</h1>
            <Badge variant="default" className="text-xs">
              Admin
            </Badge>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <nav className="flex border-t overflow-x-auto">
          {navItems.map((item) => (
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
