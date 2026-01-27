import { useEffect, useRef, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, Users, BarChart3, Settings, LogOut, ChefHat, UserCog, PanelLeftClose, PanelLeft, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "super-admin-sidebar-collapsed";

const navItems = [
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { to: "/super-admin/impersonation", icon: UserCog, label: "Impersonation" },
  { to: "/super-admin/users", icon: Users, label: "All Users" },
  { to: "/super-admin/users/archived", icon: Archive, label: "Archived Users" },
  { to: "/super-admin/analytics", icon: BarChart3, label: "Global Analytics" },
  { to: "/super-admin/settings", icon: Settings, label: "Settings" },
];

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading, signOut, authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);
  
  // Sidebar collapsed state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === "true";
  });

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // Redirect non-super-admins to /admin with error message
  useEffect(() => {
    if (!loading && user && !isSuperAdmin && !hasRedirected.current) {
      hasRedirected.current = true;
      toast.error("Access denied. Super admin privileges required.");
      navigate("/admin/orders", { replace: true });
    }
  }, [loading, user, isSuperAdmin, navigate]);

  if (loading || authState === "init" || authState === "checking_session" || authState === "loading_profile") {
    return <AuthLoadingScreen authState={authState} />;
  }

  // Don't render anything while redirecting
  if (!isSuperAdmin) {
    return <AuthLoadingScreen authState={authState} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside 
          className={cn(
            "border-r bg-card flex flex-col transition-all duration-300",
            isCollapsed ? "w-16" : "w-64"
          )}
        >
          {/* Header */}
          <div className={cn(
            "p-4 border-b flex items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Super Admin</span>
              </div>
            )}
            {isCollapsed && <ChefHat className="h-6 w-6 text-primary" />}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className={cn(
                "h-8 w-8 text-muted-foreground hover:text-foreground",
                isCollapsed && "hidden"
              )}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          {/* Expand button when collapsed */}
          {isCollapsed && (
            <div className="p-2 border-b flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    className={cn(
                      "flex items-center rounded-lg text-muted-foreground hover:bg-accent/50 transition-colors",
                      isCollapsed ? "justify-center p-3" : "gap-3 px-3 py-2"
                    )}
                    activeClassName="bg-primary/10 text-primary font-medium"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>

          {/* Sign Out */}
          <div className={cn("p-2 border-t", isCollapsed ? "flex justify-center" : "")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "text-muted-foreground hover:text-destructive",
                    isCollapsed ? "h-10 w-10 p-0" : "w-full justify-start"
                  )}
                  onClick={handleSignOut}
                >
                  <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && "Sign Out"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  Sign Out
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
