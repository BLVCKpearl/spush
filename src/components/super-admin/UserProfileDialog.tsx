import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Mail, 
  Calendar, 
  Building2, 
  ShoppingCart, 
  DollarSign,
  Clock,
  CheckCircle,
  Ban
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  venue_id: string | null;
  venue_name?: string;
  roles: Array<{ role: string; tenant_role: string | null }>;
}

interface UserStats {
  totalOrdersCompleted: number;
  totalOrderAmount: number;
  lastActiveAt: string | null;
}

interface UserProfileDialogProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({ user, open, onOpenChange }: UserProfileDialogProps) {
  // Fetch user order statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats", user?.user_id],
    queryFn: async (): Promise<UserStats> => {
      if (!user?.venue_id) {
        return { totalOrdersCompleted: 0, totalOrderAmount: 0, lastActiveAt: null };
      }

      // Get orders completed by this user (payment confirmations they made)
      const { data: confirmations, error: confirmError } = await supabase
        .from("payment_confirmations")
        .select(`
          id,
          confirmed_at,
          order:orders(total_kobo, status)
        `)
        .eq("confirmed_by", user.user_id)
        .order("confirmed_at", { ascending: false });

      if (confirmError) {
        console.error("Error fetching confirmations:", confirmError);
        return { totalOrdersCompleted: 0, totalOrderAmount: 0, lastActiveAt: null };
      }

      // Calculate stats
      const completedOrders = confirmations || [];
      const totalOrdersCompleted = completedOrders.length;
      const totalOrderAmount = completedOrders.reduce((sum, conf) => {
        const order = conf.order as { total_kobo: number; status: string } | null;
        return sum + (order?.total_kobo || 0);
      }, 0);

      // Get last activity from audit logs
      const { data: lastAudit } = await supabase
        .from("admin_audit_logs")
        .select("created_at")
        .eq("actor_user_id", user.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      const lastActiveAt = lastAudit?.[0]?.created_at || confirmations?.[0]?.confirmed_at || null;

      return {
        totalOrdersCompleted,
        totalOrderAmount,
        lastActiveAt,
      };
    },
    enabled: open && !!user?.user_id,
  });

  const formatCurrency = (kobo: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(kobo / 100);
  };

  const getRoleLabel = () => {
    if (!user?.roles?.length) return "No Role";
    const role = user.roles[0];
    if (role.tenant_role === "tenant_admin") return "Tenant Admin";
    if (role.tenant_role === "staff") return "Staff";
    if (role.role === "admin") return "Admin (Legacy)";
    return "Staff";
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user.display_name || "Unknown"}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email || "No email"}
                </div>
              </div>
              {user.is_active ? (
                <Badge variant="secondary" className="bg-accent text-accent-foreground">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <Ban className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{user.venue_name || "No Tenant"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="outline">{getRoleLabel()}</Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(user.created_at), "PPP")}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stats Section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Activity Stats
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-xs">Orders Completed</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalOrdersCompleted || 0}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Total Amount</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats?.totalOrderAmount || 0)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Last Active</span>
                  </div>
                  {statsLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : stats?.lastActiveAt ? (
                    <span className="text-sm font-medium">
                      {formatDistanceToNow(new Date(stats.lastActiveAt), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No activity recorded</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
