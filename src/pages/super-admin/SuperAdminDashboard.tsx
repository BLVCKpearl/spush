import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, BarChart3, Settings, LogOut, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import ForbiddenScreen from "@/components/auth/ForbiddenScreen";

const navItems = [
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { to: "/super-admin/users", icon: Users, label: "All Users" },
  { to: "/super-admin/analytics", icon: BarChart3, label: "Global Analytics" },
  { to: "/super-admin/settings", icon: Settings, label: "Settings" },
];

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading, signOut, authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || authState === "init" || authState === "checking_session" || authState === "loading_profile") {
    return <AuthLoadingScreen authState={authState} />;
  }

  if (!isSuperAdmin) {
    return <ForbiddenScreen />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent/50 transition-colors"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
