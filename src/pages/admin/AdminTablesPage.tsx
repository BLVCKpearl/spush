import { useState } from 'react';
import JSZip from 'jszip';
import AdminLayout from '@/components/admin/AdminLayout';
import { useTables, TableWithVenue } from '@/hooks/useTables';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  MoreHorizontal,
  QrCode,
  Pencil,
  Trash2,
  RefreshCw,
  Download,
  Loader2,
  Package,
} from 'lucide-react';
import { TableQRDialog } from '@/components/admin/tables/TableQRDialog';
import { CreateTableDialog } from '@/components/admin/tables/CreateTableDialog';
import { EditTableDialog } from '@/components/admin/tables/EditTableDialog';
import { generateQRCodeBlob, getTableQRUrl, downloadBlob } from '@/lib/qrcode';
import { toast } from 'sonner';

export default function AdminTablesPage() {
  // Use TenantContext for proper tenant isolation (respects impersonation)
  const { tenantId } = useTenant();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [qrDialogTable, setQrDialogTable] = useState<TableWithVenue | null>(null);
  const [editTable, setEditTable] = useState<TableWithVenue | null>(null);
  const [deleteTable, setDeleteTable] = useState<TableWithVenue | null>(null);
  const [regenerateTable, setRegenerateTable] = useState<TableWithVenue | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Tables are automatically scoped to the effective tenant
  const {
    tables,
    isLoading: tablesLoading,
    createTable,
    createBulkTables,
    updateTable,
    regenerateToken,
    deleteTable: deleteTableMutation,
  } = useTables(tenantId);

  const handleBulkDownload = async () => {
    if (tables.length === 0) {
      toast.error('No tables to download');
      return;
    }

    setBulkDownloading(true);
    try {
      const zip = new JSZip();

      for (const table of tables) {
        const url = getTableQRUrl(table.venues.venue_slug, table.qr_token);
        const blob = await generateQRCodeBlob(url, 512);
        const safeLabel = table.label.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const safeName = table.venues.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        zip.file(`${safeName}/${safeLabel}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, 'qr-codes.zip');
      toast.success(`Downloaded ${tables.length} QR codes`);
    } catch (error) {
      toast.error('Failed to generate ZIP file');
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleCreateSingle = async (data: { venue_id: string; label: string }) => {
    await createTable.mutateAsync(data);
  };

  const handleCreateBulk = async (data: { venue_id: string; labels: string[] }) => {
    await createBulkTables.mutateAsync(data);
  };

  const handleEdit = async (data: { id: string; label: string; active: boolean }) => {
    await updateTable.mutateAsync(data);
  };

  const handleDelete = async () => {
    if (!deleteTable) return;
    await deleteTableMutation.mutateAsync(deleteTable.id);
    setDeleteTable(null);
  };

  const handleRegenerate = async () => {
    if (!regenerateTable) return;
    await regenerateToken.mutateAsync(regenerateTable.id);
    setRegenerateTable(null);
  };

  return (
    <AdminLayout title="Table Management" requiredPermission="canManageTables">
      <div className="space-y-4">
        {/* Header Actions */}
        <div className="flex flex-wrap gap-4 items-center justify-end">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBulkDownload}
              disabled={bulkDownloading || tables.length === 0}
            >
              {bulkDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Download All QRs
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!tenantId}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tables
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Tables
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tables.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {tables.filter((t) => t.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inactive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {tables.filter((t) => !t.active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables List */}
        <Card>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No tables yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create tables to generate QR codes for ordering
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tables
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-medium">{table.label}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={table.active}
                            onCheckedChange={(checked) => {
                              updateTable.mutate({ id: table.id, active: checked });
                            }}
                            disabled={updateTable.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {table.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(table.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setQrDialogTable(table)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              View QR Code
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditTable(table)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setRegenerateTable(table)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate QR Token
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTable(table)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateTableDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateSingle={handleCreateSingle}
        onCreateBulk={handleCreateBulk}
        isLoading={createTable.isPending || createBulkTables.isPending}
        existingTables={tables}
        defaultVenueId={tenantId || undefined}
        hideVenueSelector={true}
      />

      <TableQRDialog
        open={!!qrDialogTable}
        onOpenChange={(open) => !open && setQrDialogTable(null)}
        table={qrDialogTable}
      />

      <EditTableDialog
        open={!!editTable}
        onOpenChange={(open) => !open && setEditTable(null)}
        table={editTable}
        onSave={handleEdit}
        isLoading={updateTable.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTable} onOpenChange={(open) => !open && setDeleteTable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTable?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this table and its QR code. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation */}
      <AlertDialog
        open={!!regenerateTable}
        onOpenChange={(open) => !open && setRegenerateTable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate QR Token?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new QR code for {regenerateTable?.label}. The old QR code will stop
              working immediately. You'll need to print and display the new QR code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
