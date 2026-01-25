import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { formatNaira } from '@/lib/currency';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  User,
  Building2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Banknote,
  CreditCard,
} from 'lucide-react';
import type { OrderWithItems } from '@/types/database';
import type { PaymentClaim } from '@/hooks/usePaymentClaims';
import SecureProofImage from './SecureProofImage';

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithItems;
  paymentClaim: PaymentClaim | null;
  onConfirm: (notes?: string) => void;
  isConfirming: boolean;
}

export default function PaymentConfirmDialog({
  open,
  onOpenChange,
  order,
  paymentClaim,
  onConfirm,
  isConfirming,
}: PaymentConfirmDialogProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes || undefined);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription>
            Review the order and payment details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">Table {order.table_number}</p>
                  <p className="text-sm text-muted-foreground font-mono">{order.order_reference}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  {order.payment_method === 'cash' ? (
                    <>
                      <Banknote className="h-3 w-3" />
                      Cash
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3 w-3" />
                      Transfer
                    </>
                  )}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-1">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}× {item.item_snapshot?.name || item.menu_items?.name}
                    </span>
                    <span>{formatNaira(item.unit_price_kobo * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatNaira(order.total_kobo)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Claim Details */}
          {paymentClaim && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <FileText className="h-4 w-4" />
                  Payment Claim Submitted
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(paymentClaim.claimed_at), { addSuffix: true })}
                </div>

                <div className="space-y-2 text-sm">
                  {paymentClaim.sender_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Sender:</span>
                      <span className="font-medium">{paymentClaim.sender_name}</span>
                    </div>
                  )}

                  {paymentClaim.bank_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">{paymentClaim.bank_name}</span>
                    </div>
                  )}

                  {paymentClaim.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="font-medium">{paymentClaim.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Proof Image */}
                {paymentClaim.proof_url && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      Payment Proof
                    </div>
                    <SecureProofImage
                      proofUrl={paymentClaim.proof_url}
                      alt="Payment proof"
                    />
                  </div>
                )}

                {!paymentClaim.sender_name && !paymentClaim.bank_name && !paymentClaim.notes && !paymentClaim.proof_url && (
                  <p className="text-sm text-muted-foreground italic">
                    No additional details provided with claim.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!paymentClaim && order.payment_method === 'bank_transfer' && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No payment claim has been submitted for this order yet.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Confirmation Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this payment confirmation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConfirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
