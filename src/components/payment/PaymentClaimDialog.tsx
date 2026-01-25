import { useState } from 'react';
import { useCreatePaymentClaim } from '@/hooks/usePaymentClaims';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderReference: string;
  onSuccess?: () => void;
}

export function PaymentClaimDialog({
  open,
  onOpenChange,
  orderId,
  orderReference,
  onSuccess,
}: PaymentClaimDialogProps) {
  const [senderName, setSenderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');

  const createClaim = useCreatePaymentClaim();

  const handleSubmit = async () => {
    try {
      await createClaim.mutateAsync({
        orderId,
        senderName: senderName.trim() || undefined,
        bankName: bankName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Payment claim submitted successfully');
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to submit payment claim');
      console.error('Payment claim error:', error);
    }
  };

  const resetForm = () => {
    setSenderName('');
    setBankName('');
    setNotes('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Bank Transfer</DialogTitle>
          <DialogDescription>
            Let us know you've transferred payment for order {orderReference}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Sender Name */}
          <div className="space-y-2">
            <Label htmlFor="senderName">Sender Name (Optional)</Label>
            <Input
              id="senderName"
              placeholder="Name on your bank account"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bankName">Your Bank (Optional)</Label>
            <Input
              id="bankName"
              placeholder="e.g. GTBank, Access Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createClaim.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createClaim.isPending}
          >
            {createClaim.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Claim
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
