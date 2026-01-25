import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useOrder } from '@/hooks/useOrders';
import { usePaymentClaims } from '@/hooks/usePaymentClaims';
import { supabase } from '@/integrations/supabase/client';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PaymentClaimDialog } from '@/components/payment/PaymentClaimDialog';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bell, 
  Loader2,
  Search,
  CreditCard,
  Send,
  XCircle,
  Banknote,
  UtensilsCrossed
} from 'lucide-react';
import type { OrderStatus } from '@/types/database';

const statusConfig: Record<OrderStatus, { 
  label: string; 
  description: string;
  icon: React.ElementType; 
  color: string;
  bgColor: string;
}> = {
  pending: { 
    label: 'Order Received', 
    description: 'Your order has been received and is being reviewed.',
    icon: Clock, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  pending_payment: { 
    label: 'Awaiting Payment', 
    description: 'Please complete your bank transfer to proceed with your order.',
    icon: CreditCard, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100'
  },
  cash_on_delivery: { 
    label: 'Pay When Ready', 
    description: 'Your order is being prepared. Please pay when your food arrives.',
    icon: Banknote, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  confirmed: { 
    label: 'Payment Confirmed', 
    description: 'Thank you! Your payment has been confirmed.',
    icon: CheckCircle2, 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100'
  },
  preparing: { 
    label: 'Preparing Your Order', 
    description: 'Our kitchen is now preparing your delicious meal.',
    icon: ChefHat, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  ready: { 
    label: 'Ready for Pickup', 
    description: 'Your order is ready! It will be served to your table shortly.',
    icon: Bell, 
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  completed: { 
    label: 'Order Complete', 
    description: 'Enjoy your meal! Thank you for dining with us.',
    icon: UtensilsCrossed, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  },
  cancelled: { 
    label: 'Order Cancelled', 
    description: 'This order has been cancelled.',
    icon: XCircle, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
};

export default function TrackOrderPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchRef, setSearchRef] = useState(reference || '');
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  
  const activeReference = reference || searchRef;
  const { data: order, isLoading, refetch } = useOrder(activeReference);
  const { data: paymentClaims } = usePaymentClaims(order?.id);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!order?.id) return;

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order', activeReference] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.id, activeReference, queryClient]);

  const handleSearch = () => {
    if (searchRef.trim()) {
      navigate(`/track/${searchRef.trim().toUpperCase()}`);
      refetch();
    }
  };

  const isBankTransfer = order?.payment_method === 'bank_transfer';
  const hasClaim = paymentClaims && paymentClaims.length > 0;
  const showClaimButton = isBankTransfer && !order?.payment_confirmed && !hasClaim;
  const showSearch = !reference;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Search - only show when not accessed via direct URL */}
        {showSearch && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Track Your Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter order reference (e.g., ORD-ABC123)"
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={!searchRef.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && activeReference && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && activeReference && !order && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No order found with reference "{activeReference}"
              </p>
            </CardContent>
          </Card>
        )}

        {order && (
          <>
            {/* Large Status Indicator */}
            <Card className="overflow-hidden">
              {(() => {
                const status = statusConfig[order.status];
                const StatusIcon = status.icon;
                return (
                  <>
                    <div className={`${status.bgColor} p-6 text-center`}>
                      <div className={`inline-flex p-4 rounded-full ${status.bgColor} mb-3`}>
                        <StatusIcon className={`h-12 w-12 ${status.color}`} />
                      </div>
                      <h2 className={`text-2xl font-bold ${status.color}`}>
                        {status.label}
                      </h2>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {status.description}
                      </p>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Order Reference</span>
                        <span className="font-mono font-medium">{order.order_reference}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-muted-foreground">Table</span>
                        <span className="font-medium">Table {order.table_number}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-muted-foreground">Payment Method</span>
                        <Badge variant={order.payment_method === 'bank_transfer' ? 'secondary' : 'outline'}>
                          {order.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-muted-foreground">Payment Status</span>
                        <Badge variant={order.payment_confirmed ? 'default' : 'destructive'}>
                          {order.payment_confirmed ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                    </CardContent>
                  </>
                );
              })()}
            </Card>

            {/* Payment Claim Section for Bank Transfer */}
            {isBankTransfer && !order.payment_confirmed && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Payment Action Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hasClaim ? (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 text-primary">
                        <Send className="h-5 w-5" />
                        <span className="font-medium">Transfer Claim Submitted</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        We've received your transfer notification. Awaiting confirmation from the restaurant.
                      </p>
                      {paymentClaims[0]?.proof_url && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Uploaded proof:</p>
                          <img
                            src={paymentClaims[0].proof_url}
                            alt="Payment proof"
                            className="w-full max-w-xs h-auto rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Completed your bank transfer? Let us know so we can start preparing your order.
                      </p>
                      <Button
                        onClick={() => setClaimDialogOpen(true)}
                        className="w-full"
                        size="lg"
                      >
                        <CreditCard className="mr-2 h-5 w-5" />
                        I've Transferred
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      <span className="font-medium">{item.quantity}×</span> {item.item_snapshot.name}
                    </span>
                    <span className="font-medium">{formatNaira(item.unit_price_kobo * item.quantity)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatNaira(order.total_kobo)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Claim Dialog */}
            <PaymentClaimDialog
              open={claimDialogOpen}
              onOpenChange={setClaimDialogOpen}
              orderId={order.id}
              orderReference={order.order_reference}
            />
          </>
        )}
      </div>
    </div>
  );
}
