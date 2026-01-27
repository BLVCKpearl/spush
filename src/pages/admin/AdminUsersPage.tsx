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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUsers, useUpdateUser, type ManagedUser, type StatusFilter } from '@/hooks/useUserManagement';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
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
  AlertCircle,
  Info,
} from 'lucide-react';
import CreateUserDialog from '@/components/admin/users/CreateUserDialog';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ResetPasswordDialog from '@/components/admin/users/ResetPasswordDialog';
import ModifyPasswordDialog from '@/components/admin/users/ModifyPasswordDialog';
import DeleteUserDialog from '@/components/admin/users/DeleteUserDialog';
import UserActionsDropdown from '@/components/admin/users/UserActionsDropdown';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminUsersPage() {
  const { tenantId, isImpersonating } = useTenant();
  const { isSuperAdmin, isTenantAdmin, user: currentUser } = useAuth();
  const isAdmin = isTenantAdmin || isSuperAdmin;
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [modifyPasswordDialogOpen, setModifyPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Scope users query to current tenant with status filter
  const { data, isLoading, error } = useUsers(tenantId, { statusFilter });
  const users = data?.users || [];
  const diagnostics = data?.diagnostics;
  
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  // Count active admins for last-admin protection
  const activeAdminCount = users?.filter(
    (u) => (u.role === 'admin' || u.tenant_role === 'tenant_admin') && u.is_active
  ).length ?? 0;

  const handleEdit = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleResetPassword = (user: ManagedUser) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const handleModifyPassword = (user: ManagedUser) => {
    setSelectedUser(user);
    setModifyPasswordDialogOpen(true);
  };

  const handleDelete = (user: ManagedUser) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
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

  const getRoleBadge = (user: ManagedUser) => {
    const role = user.tenant_role || user.role;
    if (role === 'tenant_admin' || role === 'admin') {
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

  const getStatusBadge = (user: ManagedUser) => {
    if (user.is_archived) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          Archived
        </Badge>
      );
    }
    if (user.is_active) {
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

  // Show message if no tenant is selected
  if (!tenantId) {
    return (
      <AdminLayout title="User Management" adminOnly>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenant context available.</p>
            <p className="text-sm">Please ensure you're logged in with proper tenant access.</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="User Management" adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Create and manage admin and staff accounts.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        {/* Impersonation notice */}
        {isImpersonating && (
          <Alert className="border-primary/50 bg-primary/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              You are managing users for this tenant via impersonation. All actions are logged.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Team Members</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active only</SelectItem>
                  <SelectItem value="inactive">Inactive only</SelectItem>
                  <SelectItem value="all">All users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Diagnostics info */}
            {diagnostics && diagnostics.filtered > 0 && (
              <Alert className="mb-4 border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {diagnostics.reason}. {diagnostics.filtered} user(s) filtered out.
                  {statusFilter !== 'all' && (
                    <Button
                      variant="link"
                      className="h-auto p-0 ml-1"
                      onClick={() => setStatusFilter('all')}
                    >
                      Show all
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

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
                {statusFilter !== 'all' ? (
                  <p className="text-sm">
                    Try changing the filter to see more users, or{' '}
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      create a new user
                    </Button>
                    .
                  </p>
                ) : (
                  <p className="text-sm">
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      Create your first user
                    </Button>
                    .
                  </p>
                )}
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
                          {user.user_id === currentUser?.id && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user)}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <UserActionsDropdown
                            user={user}
                            currentUserId={currentUser?.id ?? ''}
                            isAdmin={isAdmin}
                            activeAdminCount={activeAdminCount}
                            onEdit={() => handleEdit(user)}
                            onResetPassword={() => handleResetPassword(user)}
                            onModifyPassword={() => handleModifyPassword(user)}
                            onToggleActive={() => handleToggleActive(user)}
                            onDelete={() => handleDelete(user)}
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
      <CreateUserDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        tenantId={tenantId}
      />
      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
        activeAdminCount={activeAdminCount}
      />
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        user={selectedUser}
      />
      <ModifyPasswordDialog
        open={modifyPasswordDialogOpen}
        onOpenChange={setModifyPasswordDialogOpen}
        user={selectedUser}
      />
      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
      />
    </AdminLayout>
  );
}
