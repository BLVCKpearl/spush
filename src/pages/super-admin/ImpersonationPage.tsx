import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTenants, type ManagedTenant } from "@/hooks/useTenantManagement";
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
import { Search, UserCog, AlertTriangle, Loader2, Ban, CheckCircle, Users, ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ImpersonationPage() {
  const navigate = useNavigate();
  const { startImpersonation, isImpersonating, impersonatedTenant } = useImpersonation();
  const { data: tenants, isLoading } = useTenants();

  const [searchQuery, setSearchQuery] = useState("");
  const [confirmTenant, setConfirmTenant] = useState<ManagedTenant | null>(null);

  const filteredTenants = tenants?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.venue_slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartImpersonation = async () => {
    if (!confirmTenant) return;

    await startImpersonation({
      id: confirmTenant.id,
      name: confirmTenant.name,
      venue_slug: confirmTenant.venue_slug,
    });

    setConfirmTenant(null);
    navigate("/admin/orders");
  };

  return (
    <div className="p-6 space-y-6">
      <PageTitle
        title="Impersonation"
        subtitle="Access tenant dashboards as if you were their admin"
      />

      {/* Warning Banner */}
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            Important Notice
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Impersonation allows you to view and manage a tenant's data as if you were their admin.
            All actions performed during impersonation are logged for security auditing.
          </p>
          <p>
            <strong>Remember:</strong> You will see a red warning banner at the top of the screen
            while impersonating. Click "Exit Impersonation" to return to this dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Current Impersonation Status */}
      {isImpersonating && impersonatedTenant && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <UserCog className="h-5 w-5" />
              Currently Impersonating
            </CardTitle>
            <CardDescription>
              You are currently impersonating <strong>{impersonatedTenant.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => navigate("/admin/orders")}>
              Go to Impersonated Dashboard
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by tenant name, slug, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Select Tenant to Impersonate</CardTitle>
          <CardDescription>Click on a tenant to start an impersonation session</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]"></TableHead>
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
                    {searchQuery ? "No tenants match your search" : "No tenants found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants?.map((tenant) => (
                  <TableRow key={tenant.id} className={tenant.is_suspended ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tenant.venue_slug}</Badge>
                    </TableCell>
                    <TableCell>
                      {tenant.is_suspended ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" /> Suspended
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                          <CheckCircle className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {tenant._count?.users || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                        {tenant._count?.orders || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(tenant.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => setConfirmTenant(tenant)}
                        disabled={tenant.is_suspended}
                      >
                        <UserCog className="h-4 w-4 mr-1" />
                        Impersonate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmTenant} onOpenChange={() => setConfirmTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Start Impersonation
            </DialogTitle>
            <DialogDescription>
              You are about to impersonate <strong>"{confirmTenant?.name}"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 text-sm text-muted-foreground">
            <p>• You will have full admin access to this tenant's dashboard</p>
            <p>• All actions will be logged with your super admin ID</p>
            <p>• A red warning banner will be visible at all times</p>
            <p>• Click "Exit Impersonation" in the banner to return here</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTenant(null)}>
              Cancel
            </Button>
            <Button onClick={handleStartImpersonation}>Start Impersonation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
