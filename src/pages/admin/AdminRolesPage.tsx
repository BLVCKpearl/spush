import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, UserPlus, Trash2, Shield, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type AppRole = 'admin' | 'staff';

interface UserWithRoles {
  id: string;
  email: string;
  roles: AppRole[];
}

export default function AdminRolesPage() {
  const { loading: authLoading } = useRequireAuth('admin');
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsersWithRoles = async () => {
    try {
      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Group roles by user_id
      const userRolesMap = new Map<string, AppRole[]>();
      const userIds = new Set<string>();

      roles?.forEach((r) => {
        userIds.add(r.user_id);
        const existing = userRolesMap.get(r.user_id) || [];
        userRolesMap.set(r.user_id, [...existing, r.role as AppRole]);
      });

      // For now, we'll display users based on their roles
      // In a production app, you'd want a profiles table or admin API
      const usersWithRoles: UserWithRoles[] = Array.from(userIds).map((userId) => ({
        id: userId,
        email: `User ${userId.slice(0, 8)}...`, // Placeholder - see note below
        roles: userRolesMap.get(userId) || [],
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUsersWithRoles();
    }
  }, [authLoading]);

  const addRole = async (userId: string, role: AppRole) => {
    setActionLoading(`add-${userId}-${role}`);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === '23505') {
          toast.error('User already has this role');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Added ${role} role`);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    } finally {
      setActionLoading(null);
    }
  };

  const removeRole = async (userId: string, role: AppRole) => {
    setActionLoading(`remove-${userId}-${role}`);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success(`Removed ${role} role`);
      fetchUsersWithRoles();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Failed to remove role');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleIcon = (role: AppRole) => {
    return role === 'admin' ? ShieldCheck : Shield;
  };

  const getRoleVariant = (role: AppRole): "default" | "secondary" => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  if (authLoading || loading) {
    return (
      <AdminLayout title="User Roles">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Roles">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Add Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No users with roles found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">
                      {user.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {user.roles.map((role) => {
                          const Icon = getRoleIcon(role);
                          return (
                            <Badge key={role} variant={getRoleVariant(role)} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {role}
                            </Badge>
                          );
                        })}
                        {user.roles.length === 0 && (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => addRole(user.id, value as AppRole)}
                        disabled={actionLoading?.startsWith(`add-${user.id}`)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Add role" />
                        </SelectTrigger>
                        <SelectContent>
                          {!user.roles.includes('admin') && (
                            <SelectItem value="admin">Admin</SelectItem>
                          )}
                          {!user.roles.includes('staff') && (
                            <SelectItem value="staff">Staff</SelectItem>
                          )}
                          {user.roles.includes('admin') && user.roles.includes('staff') && (
                            <SelectItem value="" disabled>
                              All roles assigned
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {user.roles.map((role) => (
                          <AlertDialog key={role}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === `remove-${user.id}-${role}`}
                              >
                                {actionLoading === `remove-${user.id}-${role}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove {role}
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {role} role?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will revoke {role} privileges from this user. They will lose access to {role === 'admin' ? 'all admin features' : 'staff features'}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => removeRole(user.id, role)}
                                >
                                  Remove Role
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
          <p className="font-medium mb-2">Note:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Admin</strong>: Full access to all features (orders, menu, analytics, bank details, roles)</li>
            <li><strong>Staff</strong>: Access to orders and payment confirmation only</li>
            <li>Users need at least one role to access the admin panel</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
