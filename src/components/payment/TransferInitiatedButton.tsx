import { useState } from 'react';
import { useCreatePaymentClaim } from '@/hooks/usePaymentClaims';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface TransferInitiatedButtonProps {
  orderId: string;
  orderReference: string;
}

export function TransferInitiatedButton({
  orderId,
  orderReference,
}: TransferInitiatedButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const createClaim = useCreatePaymentClaim();

  const handleTransferInitiated = async () => {
    setIsSubmitting(true);
    try {
      // Create payment claim immediately without requiring form input
      await createClaim.mutateAsync({
        orderId,
        // All fields are optional - just mark transfer as initiated
        senderName: undefined,
        bankName: undefined,
        notes: 'Transfer initiated by guest',
      });
      
      setIsSuccess(true);
      toast.success('Transfer initiated! We\'ll start preparing your order.');
    } catch (error) {
      console.error('Failed to mark transfer as initiated:', error);
      toast.error('Failed to record transfer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success state briefly before query invalidation refreshes the page
  if (isSuccess) {
    return (
      <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Transfer Initiated
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Your order is being prepared while we confirm payment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-primary/5 border-primary">
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Completed your bank transfer? Let us know so we can start preparing your order.
        </p>
        <Button
          onClick={handleTransferInitiated}
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-5 w-5" />
              I've Transferred
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
