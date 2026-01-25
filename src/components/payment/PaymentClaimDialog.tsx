import { useState, useRef } from 'react';
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
import { Upload, Loader2, CheckCircle2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderReference: string;
}

export function PaymentClaimDialog({
  open,
  onOpenChange,
  orderId,
  orderReference,
}: PaymentClaimDialogProps) {
  const [senderName, setSenderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createClaim = useCreatePaymentClaim();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    try {
      await createClaim.mutateAsync({
        orderId,
        proofFile: selectedFile || undefined,
        senderName: senderName.trim() || undefined,
        bankName: bankName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('Payment claim submitted successfully');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit payment claim');
      console.error('Payment claim error:', error);
    }
  };

  const resetForm = () => {
    setSenderName('');
    setBankName('');
    setNotes('');
    setSelectedFile(null);
    setPreviewUrl(null);
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
          {/* Proof Upload */}
          <div className="space-y-2">
            <Label>Transfer Receipt (Optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Transfer proof preview"
                  className="w-full h-40 object-cover rounded-md border"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Upload receipt screenshot
                  </span>
                </div>
              </Button>
            )}
          </div>

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
