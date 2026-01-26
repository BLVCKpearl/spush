import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAllBankDetails, useCreateBankDetails, useUpdateBankDetails } from '@/hooks/useBankDetails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Plus, Pencil, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BankDetails } from '@/types/database';

export default function AdminBankDetailsPage() {
  const { data: bankDetails, isLoading } = useAllBankDetails();
  const createBankDetails = useCreateBankDetails();
  const updateBankDetails = useUpdateBankDetails();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankDetails | null>(null);

  const handleSubmit = async (data: Omit<BankDetails, 'id' | 'created_at'>) => {
    try {
      if (editing) {
        await updateBankDetails.mutateAsync({ id: editing.id, ...data });
        toast.success('Bank details updated');
      } else {
        await createBankDetails.mutateAsync(data);
        toast.success('Bank details added');
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error('Failed to save bank details');
    }
  };

  const handleSetActive = async (details: BankDetails) => {
    try {
      // Update existing record to be active
      await updateBankDetails.mutateAsync({
        id: details.id,
        is_active: true,
      });
      toast.success('Bank details set as active');
    } catch (error) {
      toast.error('Failed to update bank details');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Bank Details" requiredPermission="canManageBankDetails">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const activeDetails = bankDetails?.find((d) => d.is_active);

  return (
    <AdminLayout title="Bank Details" requiredPermission="canManageBankDetails">
      <div className="space-y-6">
        {/* Current Active Bank */}
        <section>
          <h3 className="font-semibold mb-4">Active Bank Account</h3>
          {activeDetails ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{activeDetails.bank_name}</h4>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeDetails.account_name}
                    </p>
                    <p className="font-mono text-lg mt-2">
                      {activeDetails.account_number}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(activeDetails);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  No bank details configured. Guests won't be able to see bank transfer information.
                </p>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) setEditing(null);
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Bank Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <BankDetailsForm
                      details={editing}
                      onSubmit={handleSubmit}
                      isLoading={createBankDetails.isPending || updateBankDetails.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Add/Edit Dialog */}
        {activeDetails && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Another Bank
              </Button>
            </DialogTrigger>
            <DialogContent>
              <BankDetailsForm
                details={editing}
                onSubmit={handleSubmit}
                isLoading={createBankDetails.isPending || updateBankDetails.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              The active bank account details will be shown to guests when they select bank transfer as payment method. Only one bank account can be active at a time.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function BankDetailsForm({
  details,
  onSubmit,
  isLoading,
}: {
  details: BankDetails | null;
  onSubmit: (data: Omit<BankDetails, 'id' | 'created_at'>) => void;
  isLoading: boolean;
}) {
  const [bankName, setBankName] = useState(details?.bank_name || '');
  const [accountName, setAccountName] = useState(details?.account_name || '');
  const [accountNumber, setAccountNumber] = useState(details?.account_number || '');
  const [isActive, setIsActive] = useState(details?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bankName.trim() && accountName.trim() && accountNumber.trim()) {
      onSubmit({
        venue_id: details?.venue_id || null,
        bank_name: bankName.trim(),
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        is_active: isActive,
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {details ? 'Edit Bank Details' : 'Add Bank Details'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input
            id="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., Access Bank"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountName">Account Name</Label>
          <Input
            id="accountName"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g., Restaurant Name Limited"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumber">Account Number</Label>
          <Input
            id="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="e.g., 0123456789"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Set as Active</Label>
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isLoading || !bankName.trim() || !accountName.trim() || !accountNumber.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
}
