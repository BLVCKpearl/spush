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
import { Search, Shield, ShieldCheck, User, ArchiveRestore, Loader2, Archive } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface ArchivedUser {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  archived_at: string | null;
  archived_by: string | null;
  venue_id: string | null;
  venue_name?: string;
  roles: Array<{ id: string; role: string; tenant_role: string | null; tenant_id: string | null }>;
  is_super_admin: boolean;
  archiver_name?: string;
}

export default function ArchivedUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [restoreDialogUser, setRestoreDialogUser] = useState<ArchivedUser | null>(null);

  // Fetch archived users
  const { data: archivedUsers, isLoading } = useQuery({
    queryKey: ["archived-users"],
    queryFn: async () => {
      // Get archived profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_archived", true)
        .order("archived_at", { ascending: false });

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

      // Get archiver names
      const archiverIds = [...new Set(profiles?.filter(p => p.archived_by).map(p => p.archived_by) || [])];
      const { data: archivers } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", archiverIds);
      
      const archiverMap = new Map(archivers?.map(a => [a.user_id, a.display_name || a.email]) || []);

      // Combine data
      const usersWithRoles: ArchivedUser[] = (profiles || []).map((profile) => {
        const roles = userRoles?.filter((r) => r.user_id === profile.user_id) || [];
        return {
          ...profile,
          venue_name: profile.venue_id ? venueMap.get(profile.venue_id) : undefined,
          roles,
          is_super_admin: superAdminIds.has(profile.user_id),
          archiver_name: profile.archived_by ? archiverMap.get(profile.archived_by) : undefined,
        };
      });

      return usersWithRoles;
    },
  });

  // Restore user mutation
  const restoreMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_archived: false, 
          archived_at: null, 
          archived_by: null,
          is_active: true 
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the action
      await supabase.from("admin_audit_logs").insert({
        action: "user_restored",
        actor_user_id: currentUser?.id || "",
        target_user_id: userId,
        metadata: { timestamp: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-all-users"] });
      toast.success("User restored successfully");
      setRestoreDialogUser(null);
    },
    onError: (error) => {
      toast.error(`Failed to restore user: ${error.message}`);
    },
  });

  // Filter users
  const filteredUsers = archivedUsers?.filter((user) => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getRoleBadge = (user: ArchivedUser) => {
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

    return <Badge variant="outline">No Role</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <PageTitle 
        title="Archived Users" 
        subtitle="View and restore archived users" 
      />

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Archive className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{archivedUsers?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Archived Users</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Archived Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead>Archived By</TableHead>
                <TableHead className="w-[100px]"></TableHead>
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
                    No archived users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id} className="opacity-70">
                    <TableCell className="font-medium">
                      {user.display_name || "—"}
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
                    <TableCell className="text-muted-foreground text-sm">
                      {user.archived_at 
                        ? format(new Date(user.archived_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.archiver_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreDialogUser(user)}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreDialogUser} onOpenChange={(open) => !open && setRestoreDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore User</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore "{restoreDialogUser?.display_name || restoreDialogUser?.email}"? 
              They will be moved back to the active users list and their access will be reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => restoreDialogUser && restoreMutation.mutate(restoreDialogUser.user_id)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
