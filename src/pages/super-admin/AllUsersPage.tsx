import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageTitle from "@/components/layout/PageTitle";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, Shield, ShieldCheck, User, MoreHorizontal, KeyRound, Ban, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserWithRoles {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  venue_id: string | null;
  venue_name?: string;
  roles: Array<{ role: string; tenant_role: string | null; tenant_id: string | null }>;
  is_super_admin: boolean;
}

export default function AllUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [revokeDialogUser, setRevokeDialogUser] = useState<UserWithRoles | null>(null);
  const [resetDialogUser, setResetDialogUser] = useState<UserWithRoles | null>(null);

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["super-admin-all-users"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get super admins
      const { data: superAdmins } = await supabase
        .from("super_admins")
        .select("user_id");

      const superAdminIds = new Set(superAdmins?.map((sa) => sa.user_id) || []);

      // Get all user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role, tenant_role, tenant_id");

      // Get venues for names
      const { data: venues } = await supabase.from("venues").select("id, name");
      const venueMap = new Map(venues?.map((v) => [v.id, v.name]) || []);

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const roles = userRoles?.filter((r) => r.user_id === profile.user_id) || [];
        return {
          ...profile,
          venue_name: profile.venue_id ? venueMap.get(profile.venue_id) : undefined,
          roles,
          is_super_admin: superAdminIds.has(profile.user_id),
        };
      });

      return usersWithRoles;
    },
  });

  // Revoke access mutation (deactivate user)
  const revokeMutation = useMutation({
    mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: activate })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: activate ? "user_reactivated" : "user_deactivated",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { 
          action_type: activate ? "reactivate" : "revoke",
          timestamp: new Date().toISOString(),
        },
      });
    },
    onSuccess: (_, { activate }) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      toast.success(activate ? "User reactivated successfully" : "User access revoked");
      setRevokeDialogUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Password reset mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "service_set_password",
          userId,
          newPassword: "Reset123!", // Temporary password
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Set must_change_password flag
      await supabase
        .from("profiles")
        .update({ must_change_password: true })
        .eq("user_id", userId);

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: "password_reset_by_super_admin",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { timestamp: new Date().toISOString() },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      toast.success("Password reset to 'Reset123!' - user must change on next login");
      setResetDialogUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to reset password: ${error.message}`);
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (user: UserWithRoles) => {
    if (user.is_super_admin) {
      return (
        <Badge className="bg-primary text-primary-foreground">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }

    const tenantAdminRole = user.roles.find((r) => r.tenant_role === "tenant_admin");
    if (tenantAdminRole) {
      return (
        <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          Tenant Admin
        </Badge>
      );
    }

    const staffRole = user.roles.find((r) => r.tenant_role === "staff" || r.role === "staff");
    if (staffRole) {
      return (
        <Badge variant="outline">
          <User className="h-3 w-3 mr-1" />
          Staff
        </Badge>
      );
    }

    // Legacy admin role
    const legacyAdmin = user.roles.find((r) => r.role === "admin");
    if (legacyAdmin) {
      return (
        <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          Admin (Legacy)
        </Badge>
      );
    }

    return <Badge variant="outline">No Role</Badge>;
  };

  const canManageUser = (user: UserWithRoles) => {
    // Cannot manage super admins or self
    return !user.is_super_admin && user.user_id !== currentUser?.id;
  };

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="All Users" subtitle="View and manage users across all tenants" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.is_super_admin).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Super Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.roles.some((r) => r.tenant_role === "tenant_admin")).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Tenant Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.is_active).length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id} className={!user.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.display_name || "—"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
                    <TableCell>
                      {user.venue_name ? (
                        <Badge variant="outline">{user.venue_name}</Badge>
                      ) : user.is_super_admin ? (
                        <span className="text-muted-foreground">All Tenants</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {canManageUser(user) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setResetDialogUser(user)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setRevokeDialogUser(user)}
                              className={user.is_active ? "text-destructive focus:text-destructive" : "text-primary"}
                            >
                              {user.is_active ? (
                                <>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Revoke Access
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reactivate User
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revoke/Reactivate Confirmation Dialog */}
      <Dialog open={!!revokeDialogUser} onOpenChange={(open) => !open && setRevokeDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {revokeDialogUser?.is_active ? "Revoke Access" : "Reactivate User"}
            </DialogTitle>
            <DialogDescription>
              {revokeDialogUser?.is_active
                ? `Are you sure you want to revoke access for "${revokeDialogUser?.display_name || revokeDialogUser?.email}"? They will no longer be able to sign in.`
                : `Are you sure you want to reactivate "${revokeDialogUser?.display_name || revokeDialogUser?.email}"? They will be able to sign in again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogUser(null)}>
              Cancel
            </Button>
            <Button
              variant={revokeDialogUser?.is_active ? "destructive" : "default"}
              onClick={() => revokeDialogUser && revokeMutation.mutate({ 
                userId: revokeDialogUser.user_id, 
                activate: !revokeDialogUser.is_active 
              })}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending
                ? "Processing..."
                : revokeDialogUser?.is_active
                  ? "Revoke Access"
                  : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation Dialog */}
      <Dialog open={!!resetDialogUser} onOpenChange={(open) => !open && setResetDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset the password for "{resetDialogUser?.display_name || resetDialogUser?.email}" to a temporary value? They will be required to change it on their next login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => resetDialogUser && resetPasswordMutation.mutate(resetDialogUser.user_id)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
