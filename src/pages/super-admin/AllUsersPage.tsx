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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Shield, ShieldCheck, User, MoreHorizontal, KeyRound, Ban, CheckCircle, Loader2, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import UserProfileDialog from "@/components/super-admin/UserProfileDialog";
import EditUserDialog from "@/components/super-admin/EditUserDialog";

interface UserWithRoles {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  venue_id: string | null;
  venue_name?: string;
  roles: Array<{ id: string; role: string; tenant_role: string | null; tenant_id: string | null }>;
  is_super_admin: boolean;
}

type RoleFilter = "all" | "super_admin" | "tenant_admin" | "staff";
type StatusFilter = "all" | "active" | "inactive";

export default function AllUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  
  const [revokeDialogUser, setRevokeDialogUser] = useState<UserWithRoles | null>(null);
  const [resetDialogUser, setResetDialogUser] = useState<UserWithRoles | null>(null);
  const [editDialogUser, setEditDialogUser] = useState<UserWithRoles | null>(null);
  const [archiveDialogUser, setArchiveDialogUser] = useState<UserWithRoles | null>(null);
  const [profileDialogUser, setProfileDialogUser] = useState<UserWithRoles | null>(null);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);

  // Fetch all venues for filter dropdown
  const { data: venues } = useQuery({
    queryKey: ["all-venues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all users with their roles (excluding archived)
  const { data: users, isLoading } = useQuery({
    queryKey: ["super-admin-all-users"],
    queryFn: async () => {
      // Get all profiles (excluding archived)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_archived", false)
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
        .select("id, user_id, role, tenant_role, tenant_id");

      // Get venues for names
      const { data: venuesData } = await supabase.from("venues").select("id, name");
      const venueMap = new Map(venuesData?.map((v) => [v.id, v.name]) || []);

      // Combine data
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => {
        const roles = userRoles?.filter((r) => r.user_id === profile.user_id) || [];
        return {
          ...profile,
          is_archived: profile.is_archived || false,
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
          password: "Reset123!",
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

  // Edit user mutation with validation
  const editUserMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      displayName, 
      roleType,
      tenantId: newTenantId,
    }: { 
      userId: string; 
      displayName: string; 
      roleType: "super_admin" | "tenant_admin" | "staff";
      tenantId: string | null;
    }) => {
      // Get current user data to check role changes
      const targetUser = users?.find(u => u.user_id === userId);
      const wasSuperAdmin = targetUser?.is_super_admin;
      const isSuperAdmin = roleType === "super_admin";

      // VALIDATION: Check if demoting last super admin
      if (wasSuperAdmin && !isSuperAdmin) {
        const { count } = await supabase
          .from("super_admins")
          .select("*", { count: "exact", head: true });
        
        if ((count || 0) <= 1) {
          throw new Error("Cannot change role: There must be at least one Super Admin at all times.");
        }
      }

      // VALIDATION: Check if demoting last tenant admin of a tenant
      const wasTenantAdmin = targetUser?.roles?.some(r => r.tenant_role === "tenant_admin");
      const oldTenantId = targetUser?.roles?.find(r => r.tenant_role === "tenant_admin")?.tenant_id;
      
      if (wasTenantAdmin && oldTenantId) {
        // Check if changing from tenant_admin to something else, or changing tenant
        const isLeavingTenantAdmin = roleType !== "tenant_admin" || 
          (roleType === "tenant_admin" && newTenantId !== oldTenantId);
        
        if (isLeavingTenantAdmin) {
          const { data: tenantAdmins } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("tenant_id", oldTenantId)
            .eq("tenant_role", "tenant_admin");
          
          const activeTenantAdmins = await Promise.all(
            (tenantAdmins || []).map(async (ta) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("is_active")
                .eq("user_id", ta.user_id)
                .single();
              return profile?.is_active ? ta : null;
            })
          );
          
          const activeCount = activeTenantAdmins.filter(Boolean).length;
          
          if (activeCount <= 1) {
            throw new Error("Cannot change role: There must be at least one Tenant Admin per tenant.");
          }
        }
      }

      // Update profile - clear venue_id for super admins
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          display_name: displayName,
          venue_id: isSuperAdmin ? null : newTenantId,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Update user metadata in auth
      await supabase.functions.invoke("manage-users", {
        body: {
          action: "update",
          userId,
          fullName: displayName,
        },
      });

      // Handle super_admin role changes
      if (isSuperAdmin && !wasSuperAdmin) {
        // Promote to super admin - add to super_admins table
        const { error: insertError } = await supabase
          .from("super_admins")
          .insert({ 
            user_id: userId, 
            email: targetUser?.email || "",
            display_name: displayName,
          });
        if (insertError) throw insertError;

        // Remove all tenant roles
        await supabase.from("user_roles").delete().eq("user_id", userId);

      } else if (!isSuperAdmin && wasSuperAdmin) {
        // Demote from super admin - remove from super_admins table
        const { error: deleteError } = await supabase
          .from("super_admins")
          .delete()
          .eq("user_id", userId);
        if (deleteError) throw deleteError;

        // Add tenant role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ 
            user_id: userId, 
            role: roleType === "tenant_admin" ? "admin" : "staff",
            tenant_id: newTenantId,
            tenant_role: roleType,
          });
        if (roleError) throw roleError;

      } else if (!isSuperAdmin) {
        // Update existing tenant role
        // First, delete all existing roles for this user
        await supabase.from("user_roles").delete().eq("user_id", userId);
        
        // Then insert the new role
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ 
            user_id: userId, 
            role: roleType === "tenant_admin" ? "admin" : "staff",
            tenant_id: newTenantId,
            tenant_role: roleType,
          });
        if (roleError) throw roleError;
      }

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: "user_edited",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { 
          display_name: displayName,
          role_type: roleType,
          tenant_id: newTenantId,
          timestamp: new Date().toISOString() 
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      toast.success("User updated successfully");
      setEditDialogUser(null);
      setEditValidationError(null);
    },
    onError: (error) => {
      setEditValidationError(error.message);
    },
  });

  // Archive user mutation
  const archiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_archived: true,
          is_active: false,
          archived_at: new Date().toISOString(),
          archived_by: currentUser?.id
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: "user_archived",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { timestamp: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      queryClient.invalidateQueries({ queryKey: ["archived-users"] });
      toast.success("User archived successfully");
      setArchiveDialogUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to archive user: ${error.message}`);
    },
  });

  // Filter users
  const filteredUsers = users?.filter((user) => {
    // Search filter
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Role filter
    if (roleFilter !== "all") {
      if (roleFilter === "super_admin" && !user.is_super_admin) return false;
      if (roleFilter === "tenant_admin" && !user.roles?.some((r) => r.tenant_role === "tenant_admin")) return false;
      if (roleFilter === "staff" && !user.roles?.some((r) => r.tenant_role === "staff" || r.role === "staff")) return false;
    }

    // Status filter
    if (statusFilter === "active" && !user.is_active) return false;
    if (statusFilter === "inactive" && user.is_active) return false;

    // Tenant filter
    if (tenantFilter !== "all" && user.venue_id !== tenantFilter) return false;

    return true;
  });

  const getRoleBadge = (user: UserWithRoles) => {
    if (user.is_super_admin) {
      return (
        <Badge className="bg-primary text-primary-foreground">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Super Admin
        </Badge>
      );
    }

    const tenantAdminRole = user.roles?.find((r) => r.tenant_role === "tenant_admin");
    if (tenantAdminRole) {
      return (
        <Badge variant="secondary">
          <Shield className="h-3 w-3 mr-1" />
          Tenant Admin
        </Badge>
      );
    }

    const staffRole = user.roles?.find((r) => r.tenant_role === "staff" || r.role === "staff");
    if (staffRole) {
      return (
        <Badge variant="secondary" className="border-border">
          <User className="h-3 w-3 mr-1" />
          Staff
        </Badge>
      );
    }

    // Legacy admin role
    const legacyAdmin = user.roles?.find((r) => r.role === "admin");
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

  const isStaffUser = (user: UserWithRoles) => {
    // Check if user is a staff member (not super admin, not tenant admin)
    if (user.is_super_admin) return false;
    const hasTenantAdmin = user.roles?.some(r => r.tenant_role === "tenant_admin");
    if (hasTenantAdmin) return false;
    return user.roles?.some(r => r.tenant_role === "staff" || r.role === "staff");
  };

  const handleRowClick = (user: UserWithRoles) => {
    if (isStaffUser(user)) {
      setProfileDialogUser(user);
    }
  };

  const isSelf = (user: UserWithRoles) => user.user_id === currentUser?.id;

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
              {users?.filter((u) => u.roles?.some((r) => r.tenant_role === "tenant_admin")).length || 0}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {venues?.map((venue) => (
              <SelectItem key={venue.id} value={venue.id}>
                {venue.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
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
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow 
                    key={user.id} 
                    className={`${!user.is_active ? "opacity-60" : ""} ${isStaffUser(user) ? "cursor-pointer hover:bg-muted/50" : ""}`}
                    onClick={() => handleRowClick(user)}
                  >
                    <TableCell className="font-medium">
                      {user.display_name || "—"}
                      {isSelf(user) && (
                        <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
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
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditDialogUser(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetDialogUser(user)}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!isSelf(user) && (
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
                          )}
                          {!isSelf(user) && !user.is_super_admin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setArchiveDialogUser(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive User
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Edit User Dialog */}
      <EditUserDialog
        open={!!editDialogUser}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogUser(null);
            setEditValidationError(null);
          }
        }}
        user={editDialogUser}
        onSave={async (data) => {
          setEditValidationError(null);
          await editUserMutation.mutateAsync(data);
        }}
        isSaving={editUserMutation.isPending}
        validationError={editValidationError}
      />

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

      {/* Archive User Confirmation Dialog */}
      <Dialog open={!!archiveDialogUser} onOpenChange={(open) => !open && setArchiveDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive User</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{archiveDialogUser?.display_name || archiveDialogUser?.email}"? 
              They will be removed from the active users list and their access will be revoked. 
              You can restore them later from the Archived Users page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialogUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archiveDialogUser && archiveMutation.mutate(archiveDialogUser.user_id)}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <UserProfileDialog
        user={profileDialogUser}
        open={!!profileDialogUser}
        onOpenChange={(open) => !open && setProfileDialogUser(null)}
      />
    </div>
  );
}
