import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTitle from '@/components/layout/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Building2,
  Users,
  ShoppingCart,
  Search,
  MoreHorizontal,
  Eye,
  UserCog,
  Ban,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import {
  useTenants,
  useSuspendTenant,
  useCreateTenant,
  type ManagedTenant,
} from '@/hooks/useTenantManagement';

export default function TenantsPage() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [suspendDialogTenant, setSuspendDialogTenant] = useState<ManagedTenant | null>(null);

  const { data: tenants, isLoading } = useTenants();
  const suspendMutation = useSuspendTenant();
  const createMutation = useCreateTenant();

  const filteredTenants = tenants?.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.venue_slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTenant = () => {
    if (!newTenantName.trim() || !newTenantSlug.trim()) return;
    createMutation.mutate(
      { name: newTenantName, slug: newTenantSlug },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewTenantName('');
          setNewTenantSlug('');
        },
      }
    );
  };

  const handleNameChange = (name: string) => {
    setNewTenantName(name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setNewTenantSlug(slug);
  };

  const handleImpersonate = async (tenant: ManagedTenant) => {
    await startImpersonation({
      id: tenant.id,
      name: tenant.name,
      venue_slug: tenant.venue_slug,
    });
    navigate('/admin/orders');
  };

  const handleSuspendConfirm = () => {
    if (!suspendDialogTenant) return;
    suspendMutation.mutate(
      { 
        tenantId: suspendDialogTenant.id, 
        suspend: !suspendDialogTenant.is_suspended,
        tenantName: suspendDialogTenant.name 
      },
      { onSuccess: () => setSuspendDialogTenant(null) }
    );
  };

  const getStatusBadge = (tenant: ManagedTenant) => {
    if (tenant.is_suspended) {
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" />
          Suspended
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-primary border-primary/30">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Tenants" subtitle="Manage all business workspaces" />
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{tenants?.length || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {tenants?.filter((t) => !t.is_suspended).length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {tenants?.reduce((sum, t) => sum + (t._count?.users || 0), 0) || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {tenants?.reduce((sum, t) => sum + (t._count?.orders || 0), 0) || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants by name or slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Created</TableHead>
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
              ) : filteredTenants?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No tenants match your search' : 'No tenants found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants?.map((tenant) => (
                  <TableRow 
                    key={tenant.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${tenant.is_suspended ? 'opacity-60' : ''}`}
                    onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                  >
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tenant.venue_slug}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(tenant)}</TableCell>
                    <TableCell>{tenant._count?.users || 0}</TableCell>
                    <TableCell>{tenant._count?.orders || 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleImpersonate(tenant)}>
                            <UserCog className="h-4 w-4 mr-2" />
                            Impersonate Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/v/${tenant.venue_slug}`, '_blank')
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Public Menu
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSuspendDialogTenant(tenant)}
                            className={
                              tenant.is_suspended
                                ? 'text-primary'
                                : 'text-destructive focus:text-destructive'
                            }
                          >
                            {tenant.is_suspended ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Reactivate Tenant
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend Tenant
                              </>
                            )}
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

      {/* Create Tenant Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tenant</DialogTitle>
            <DialogDescription>
              Create a new business workspace. The owner will need to be invited separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                placeholder="e.g., Joe's Restaurant"
                value={newTenantName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                placeholder="e.g., joes-restaurant"
                value={newTenantSlug}
                onChange={(e) => setNewTenantSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Customers will access via: /v/{newTenantSlug || 'slug'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTenant} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend/Reactivate Confirmation Dialog */}
      <Dialog
        open={!!suspendDialogTenant}
        onOpenChange={(open) => !open && setSuspendDialogTenant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialogTenant?.is_suspended ? 'Reactivate' : 'Suspend'} Tenant
            </DialogTitle>
            <DialogDescription>
              {suspendDialogTenant?.is_suspended
                ? `Are you sure you want to reactivate "${suspendDialogTenant?.name}"? Their staff will be able to access the admin panel again.`
                : `Are you sure you want to suspend "${suspendDialogTenant?.name}"? Their staff will be unable to access the admin panel until reactivated.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogTenant(null)}>
              Cancel
            </Button>
            <Button
              variant={suspendDialogTenant?.is_suspended ? 'default' : 'destructive'}
              onClick={handleSuspendConfirm}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending
                ? 'Processing...'
                : suspendDialogTenant?.is_suspended
                  ? 'Reactivate'
                  : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
