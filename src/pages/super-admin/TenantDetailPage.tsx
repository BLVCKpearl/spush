import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { logAuditEvent } from "@/hooks/useAuditLog";
import PageTitle from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  MoreHorizontal,
  UserCog,
  Ban,
  CheckCircle,
  KeyRound,
  LogOut,
  Loader2,
  Search,
  Trash2,
  Play,
  Pause,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function TenantDetailPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { startImpersonation } = useImpersonation();

  const [searchQuery, setSearchQuery] = useState("");
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [forceLogoutDialogOpen, setForceLogoutDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: string;
    email: string;
    displayName: string;
  } | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<{
    id: string;
    email: string;
    currentRole: string;
  } | null>(null);

  // Fetch tenant details
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ["super-admin-tenant-detail", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch tenant stats
  const { data: stats } = useQuery({
    queryKey: ["super-admin-tenant-stats", tenantId],
    queryFn: async () => {
      const [usersResult, ordersResult, revenueResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("venue_id", tenantId),
        supabase
          .from("orders")
          .select("total_kobo")
          .eq("venue_id", tenantId)
          .eq("payment_confirmed", true),
      ]);

      return {
        users: usersResult.count || 0,
        orders: ordersResult.count || 0,
        revenue: revenueResult.data?.reduce((sum, o) => sum + (o.total_kobo || 0), 0) || 0,
      };
    },
    enabled: !!tenantId,
  });

  // Define user type
  type TenantUser = {
    id: string;
    email: string;
    displayName: string;
    role: "tenant_admin" | "staff";
    isActive: boolean;
    createdAt: string;
  };

  // Fetch tenant users - separate queries to avoid join issues
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["super-admin-tenant-users", tenantId],
    queryFn: async (): Promise<TenantUser[]> => {
      // First get user_roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, tenant_role, created_at")
        .eq("tenant_id", tenantId);

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];

      const userIds = roles.map((r) => r.user_id);

      // Then get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, is_active")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return roles.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          id: r.user_id,
          email: profile?.email || "",
          displayName: profile?.display_name || "",
          role: (r.tenant_role || "staff") as "tenant_admin" | "staff",
          isActive: profile?.is_active ?? true,
          createdAt: r.created_at,
        };
      });
    },
    enabled: !!tenantId,
  });

  // Suspend/resume mutation
  const suspendMutation = useMutation({
    mutationFn: async (suspend: boolean) => {
      const { error } = await supabase
        .from("venues")
        .update({
          is_suspended: suspend,
          suspended_at: suspend ? new Date().toISOString() : null,
          suspended_by: suspend ? user?.id : null,
        })
        .eq("id", tenantId);

      if (error) throw error;

      if (user) {
        await logAuditEvent(user.id, {
          action: suspend ? "tenant_suspended" : "tenant_reactivated",
          tenantId: tenantId,
          metadata: { tenant_name: tenant?.name },
        });
      }
    },
    onSuccess: (_, suspend) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-detail", tenantId] });
      toast.success(suspend ? "Tenant suspended" : "Tenant resumed");
      setManageDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle user active status
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: activate })
        .eq("user_id", userId);

      if (error) throw error;

      if (user) {
        await logAuditEvent(user.id, {
          action: activate ? "user_reactivated" : "user_deactivated",
          targetUserId: userId,
          tenantId: tenantId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-users", tenantId] });
      toast.success("User status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const tempPassword = `Reset${Date.now().toString(36).toUpperCase()}!`;

      const { error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "service_set_password",
          targetUserId,
          newPassword: tempPassword,
        },
      });

      if (error) throw error;

      // Set must_change_password flag
      await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("user_id", targetUserId);

      if (user) {
        await logAuditEvent(user.id, {
          action: "password_reset",
          targetUserId,
          tenantId: tenantId,
        });
      }

      return tempPassword;
    },
    onSuccess: (tempPassword) => {
      toast.success(`Password reset. Temporary: ${tempPassword}`);
      setResetPasswordUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "tenant_admin" | "staff" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ tenant_role: newRole })
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      if (user) {
        await logAuditEvent(user.id, {
          action: "user_role_changed",
          targetUserId: userId,
          tenantId: tenantId,
          metadata: { new_role: newRole },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-users", tenantId] });
      toast.success("Role updated");
      setRoleChangeUser(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Force logout all users - deactivates all users forcing re-auth
  const forceLogoutMutation = useMutation({
    mutationFn: async () => {
      // Get all users for this tenant
      const userIds = users?.map((u) => u.id) || [];
      
      if (userIds.length > 0) {
        // Temporarily deactivate and reactivate all users to invalidate sessions
        // This forces all users to re-authenticate
        const { error } = await supabase
          .from("profiles")
          .update({ must_change_password: true })
          .in("user_id", userIds);
        
        if (error) throw error;
      }

      if (user) {
        await logAuditEvent(user.id, {
          action: "tenant_force_logout",
          tenantId: tenantId,
          metadata: { tenant_name: tenant?.name, affected_users: userIds.length },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-users", tenantId] });
      toast.success("Force logout triggered - all users will need to re-authenticate");
      setForceLogoutDialogOpen(false);
      setManageDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke tenant access - marks tenant as inactive and deactivates all users
  const revokeAccessMutation = useMutation({
    mutationFn: async () => {
      // Deactivate all users
      const userIds = users?.map((u) => u.id) || [];
      
      if (userIds.length > 0) {
        const { error: usersError } = await supabase
          .from("profiles")
          .update({ is_active: false })
          .in("user_id", userIds);
        
        if (usersError) throw usersError;
      }

      // Mark tenant as inactive
      const { error: tenantError } = await supabase
        .from("venues")
        .update({
          is_active: false,
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      if (user) {
        await logAuditEvent(user.id, {
          action: "tenant_suspended",
          tenantId: tenantId,
          metadata: { 
            tenant_name: tenant?.name, 
            reason: "access_revoked",
            affected_users: userIds.length,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-detail", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenant-users", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast.success("Tenant access revoked - marked as inactive");
      setRevokeDialogOpen(false);
      setManageDialogOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete tenant permanently
  const deleteTenantMutation = useMutation({
    mutationFn: async () => {
      // Delete all related data in order (respecting foreign keys)
      // 1. Delete orders and related data
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("venue_id", tenantId);

      if (orders && orders.length > 0) {
        const orderIds = orders.map((o) => o.id);
        await supabase.from("order_items").delete().in("order_id", orderIds);
        await supabase.from("order_events").delete().in("order_id", orderIds);
        await supabase.from("payment_claims").delete().in("order_id", orderIds);
        await supabase.from("payment_confirmations").delete().in("order_id", orderIds);
        await supabase.from("payment_proofs").delete().in("order_id", orderIds);
        await supabase.from("orders").delete().eq("venue_id", tenantId);
      }

      // 2. Delete menu items and categories
      await supabase.from("menu_items").delete().eq("venue_id", tenantId);
      await supabase.from("categories").delete().eq("venue_id", tenantId);

      // 3. Delete tables
      await supabase.from("tables").delete().eq("venue_id", tenantId);

      // 4. Delete tenant settings and features
      await supabase.from("venue_settings").delete().eq("venue_id", tenantId);
      await supabase.from("tenant_feature_flags").delete().eq("tenant_id", tenantId);
      await supabase.from("bank_details").delete().eq("venue_id", tenantId);
      await supabase.from("staff_invitations").delete().eq("tenant_id", tenantId);

      // 5. Delete user roles for this tenant
      await supabase.from("user_roles").delete().eq("tenant_id", tenantId);

      // 6. Delete profiles linked to this venue
      await supabase.from("profiles").delete().eq("venue_id", tenantId);

      // 7. Delete audit logs for this tenant
      await supabase.from("admin_audit_logs").delete().eq("tenant_id", tenantId);

      // 8. Finally delete the venue
      const { error } = await supabase.from("venues").delete().eq("id", tenantId);
      if (error) throw error;

      if (user) {
        await logAuditEvent(user.id, {
          action: "tenant_archived",
          metadata: { tenant_name: tenant?.name, tenant_id: tenantId, action: "deleted" },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      toast.success("Tenant deleted permanently");
      navigate("/super-admin/tenants");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleImpersonate = async () => {
    if (!tenant) return;
    await startImpersonation({
      id: tenant.id,
      name: tenant.name,
      venue_slug: tenant.venue_slug,
    });
    navigate("/admin/orders");
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (tenantLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Tenant not found</p>
        <Button variant="outline" onClick={() => navigate("/super-admin/tenants")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/tenants")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <PageTitle title={tenant.name} subtitle={`Slug: ${tenant.venue_slug}`} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!(tenant as any).is_active && (
            <Badge variant="secondary" className="gap-1">
              <ShieldOff className="h-3 w-3" />
              Inactive
            </Badge>
          )}
          <Badge
            variant={tenant.is_suspended ? "destructive" : "outline"}
            className={!tenant.is_suspended ? "text-primary border-primary/30" : ""}
          >
            {tenant.is_suspended ? (
              <>
                <Ban className="h-3 w-3 mr-1" /> Suspended
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" /> Active
              </>
            )}
          </Badge>
          <Button onClick={handleImpersonate} disabled={!(tenant as any).is_active}>
            <UserCog className="h-4 w-4 mr-2" /> Impersonate
          </Button>
          <Button variant="outline" onClick={() => setManageDialogOpen(true)}>
            Manage Tenant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.users || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.orders || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{formatNaira(stats?.revenue || 0)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-lg font-medium">
                {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage users for this tenant</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users match your search" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((u) => (
                  <TableRow key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{u.displayName || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "tenant_admin" ? "default" : "secondary"}>
                        {u.role === "tenant_admin" ? "Admin" : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "outline" : "destructive"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toggleUserMutation.mutate({ userId: u.id, activate: !u.isActive })}
                          >
                            {u.isActive ? (
                              <>
                                <Ban className="h-4 w-4 mr-2" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" /> Reactivate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setResetPasswordUser({ id: u.id, email: u.email, displayName: u.displayName })
                            }
                          >
                            <KeyRound className="h-4 w-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setRoleChangeUser({ id: u.id, email: u.email, currentRole: u.role })
                            }
                          >
                            <UserCog className="h-4 w-4 mr-2" /> Change Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manage Tenant Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tenant</DialogTitle>
            <DialogDescription>Actions for "{tenant.name}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {tenant.is_suspended ? (
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => suspendMutation.mutate(false)}
                disabled={suspendMutation.isPending || !(tenant as any).is_active}
              >
                <Play className="h-4 w-4 mr-2" /> Resume Tenant
              </Button>
            ) : (
              <Button
                className="w-full justify-start text-destructive hover:text-destructive"
                variant="outline"
                onClick={() => suspendMutation.mutate(true)}
                disabled={suspendMutation.isPending}
              >
                <Pause className="h-4 w-4 mr-2" /> Pause Tenant
              </Button>
            )}
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => setForceLogoutDialogOpen(true)}
              disabled={!(tenant as any).is_active}
            >
              <LogOut className="h-4 w-4 mr-2" /> Force Logout All Users
            </Button>
            <Button 
              className="w-full justify-start text-destructive hover:text-destructive" 
              variant="outline"
              onClick={() => setRevokeDialogOpen(true)}
              disabled={!(tenant as any).is_active}
            >
              <ShieldOff className="h-4 w-4 mr-2" /> Revoke Tenant Access
            </Button>
            <Button 
              className="w-full justify-start text-destructive hover:text-destructive" 
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Tenant
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Logout Confirmation Dialog */}
      <Dialog open={forceLogoutDialogOpen} onOpenChange={setForceLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" /> Force Logout All Users
            </DialogTitle>
            <DialogDescription>
              This will force all {users?.length || 0} users to re-authenticate.
              They will be required to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForceLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => forceLogoutMutation.mutate()}
              disabled={forceLogoutMutation.isPending}
            >
              {forceLogoutMutation.isPending ? "Processing..." : "Force Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" /> Revoke Tenant Access
            </DialogTitle>
            <DialogDescription>
              This will permanently revoke access for all users and mark the tenant as <strong>inactive</strong>.
              All {users?.length || 0} users will be deactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 p-4 bg-destructive/10 rounded-md border border-destructive/20">
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This action cannot be easily undone
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeAccessMutation.mutate()}
              disabled={revokeAccessMutation.isPending}
            >
              {revokeAccessMutation.isPending ? "Revoking..." : "Revoke Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeleteConfirmText("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Tenant Permanently
            </DialogTitle>
            <DialogDescription>
              This will permanently delete "{tenant.name}" and all associated data including:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 py-2">
            <li>All orders and payment records</li>
            <li>Menu items and categories</li>
            <li>Tables and QR codes</li>
            <li>All user accounts and roles</li>
            <li>Settings and configurations</li>
          </ul>
          <div className="py-2 p-4 bg-destructive/10 rounded-md border border-destructive/20">
            <p className="text-sm text-destructive font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              This action is irreversible!
            </p>
          </div>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteConfirmText("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTenantMutation.mutate()}
              disabled={deleteConfirmText !== "DELETE" || deleteTenantMutation.isPending}
            >
              {deleteTenantMutation.isPending ? "Deleting..." : "Delete Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {resetPasswordUser?.displayName || resetPasswordUser?.email}?
              They will need to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => resetPasswordUser && resetPasswordMutation.mutate(resetPasswordUser.id)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>Change role for {roleChangeUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={roleChangeUser?.currentRole}
              onValueChange={(value) => {
                if (roleChangeUser && (value === "tenant_admin" || value === "staff")) {
                  changeRoleMutation.mutate({ userId: roleChangeUser.id, newRole: value });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant_admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeUser(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
