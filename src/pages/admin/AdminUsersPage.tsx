import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useUsers, useUpdateUser, type ManagedUser } from '@/hooks/useUserManagement';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Users,
  UserPlus,
  Loader2,
  Shield,
  UserCog,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import CreateUserDialog from '@/components/admin/users/CreateUserDialog';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ResetPasswordDialog from '@/components/admin/users/ResetPasswordDialog';
import UserActionsDropdown from '@/components/admin/users/UserActionsDropdown';

export default function AdminUsersPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  const { data: users, isLoading, error } = useUsers();
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const handleEdit = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleResetPassword = (user: ManagedUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      await updateUser.mutateAsync({
        userId: user.user_id,
        isActive: !user.is_active,
      });
      toast({
        title: user.is_active ? 'User deactivated' : 'User activated',
        description: `${user.display_name || user.email} has been ${
          user.is_active ? 'deactivated' : 'activated'
        }.`,
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (role === 'admin') {
      return (
        <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === 'staff') {
      return (
        <Badge variant="secondary" className="gap-1">
          <UserCog className="h-3 w-3" />
          Staff
        </Badge>
      );
    }
    return <Badge variant="outline">None</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="outline" className="gap-1 text-primary border-primary/30">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <XCircle className="h-3 w-3" />
        Inactive
      </Badge>
    );
  };

  return (
    <AdminLayout title="User Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground">
              Create and manage admin and staff accounts.
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                Failed to load users. Please try again.
              </div>
            ) : !users?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found.</p>
                <p className="text-sm">Create your first user to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.display_name || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <UserActionsDropdown
                            user={user}
                            onEdit={() => handleEdit(user)}
                            onResetPassword={() => handleResetPassword(user)}
                            onToggleActive={() => handleToggleActive(user)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateUserDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
      />
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
      />
    </AdminLayout>
  );
}
