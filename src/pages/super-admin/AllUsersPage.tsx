import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageTitle from "@/components/layout/PageTitle";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, ShieldCheck, User } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
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
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
