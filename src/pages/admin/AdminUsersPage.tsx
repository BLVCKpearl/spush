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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers, useUpdateUser, type ManagedUser } from '@/hooks/useUserManagement';
import { useStaffInvitations, useDeleteInvitation } from '@/hooks/useStaffInvitations';
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
  Mail,
  Clock,
  Trash2,
} from 'lucide-react';
import CreateUserDialog from '@/components/admin/users/CreateUserDialog';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ResetPasswordDialog from '@/components/admin/users/ResetPasswordDialog';
import ModifyPasswordDialog from '@/components/admin/users/ModifyPasswordDialog';
import DeleteUserDialog from '@/components/admin/users/DeleteUserDialog';
import UserActionsDropdown from '@/components/admin/users/UserActionsDropdown';
import InviteStaffDialog from '@/components/admin/users/InviteStaffDialog';

export default function AdminUsersPage() {
  const { tenantId, isSuperAdmin, isTenantAdmin, user: currentUser } = useAuth();
  const isAdmin = isTenantAdmin || isSuperAdmin;
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [modifyPasswordDialogOpen, setModifyPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

  // Scope users query to current tenant
  const { data: users, isLoading, error } = useUsers(tenantId);
  const { data: invitations, isLoading: invitationsLoading } = useStaffInvitations(tenantId);
  const deleteInvitation = useDeleteInvitation();
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

  // Show message if no tenant is selected
  if (!tenantId && !isSuperAdmin) {
    return (
      <AdminLayout title="User Management" adminOnly>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tenant context available.
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!tenantId) return;
    try {
      await deleteInvitation.mutateAsync({ invitationId, tenantId });
      toast({
        title: 'Invitation deleted',
        description: 'The invitation has been cancelled.',
      });
    } catch (error) {
      toast({
        title: 'Failed to delete invitation',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Pending invitations (not accepted, not expired)
  const pendingInvitations = invitations?.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()
  ) ?? [];

  return (
    <AdminLayout title="User Management" adminOnly>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Create and manage admin and staff accounts.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(true)} disabled={!tenantId}>
              <Mail className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!tenantId}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users ({users?.length || 0})</TabsTrigger>
            <TabsTrigger value="invitations">
              Pending Invitations ({pendingInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Team Members</CardTitle>
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
                    <p className="text-sm">Create your first user or send an invitation.</p>
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
                            <TableCell>{getRoleBadge(user)}</TableCell>
                            <TableCell>{getStatusBadge(user.is_active)}</TableCell>
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
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Invitations</CardTitle>
              </CardHeader>
              <CardContent>
                {invitationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !pendingInvitations.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending invitations.</p>
                    <p className="text-sm">Click "Invite Staff" to send an invitation.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Sent</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingInvitations.map((invitation) => (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">
                              {invitation.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                {invitation.role === 'tenant_admin' ? (
                                  <>
                                    <Shield className="h-3 w-3" />
                                    Admin
                                  </>
                                ) : (
                                  <>
                                    <UserCog className="h-3 w-3" />
                                    Staff
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(invitation.expires_at), {
                                  addSuffix: true,
                                })}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDistanceToNow(new Date(invitation.created_at), {
                                addSuffix: true,
                              })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteInvitation(invitation.id)}
                                disabled={deleteInvitation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateUserDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        tenantId={tenantId}
      />
      <InviteStaffDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        tenantId={tenantId || ''}
      />
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
