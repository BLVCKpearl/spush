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
import {
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bell, 
  Loader2,
  Search,
  CreditCard,
  XCircle,
  Banknote,
  UtensilsCrossed,
  AlertTriangle
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
  expired: { 
    label: 'Order Expired', 
    description: 'This order has expired due to payment timeout. Please place a new order.',
    icon: AlertTriangle, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
};

export default function TrackOrderPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchRef, setSearchRef] = useState(reference || '');
  
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
  const isExpired = order?.status === 'expired';
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

            {/* Expired Order - Reorder Prompt */}
            {isExpired && (
              <Card className="border-destructive">
                <CardContent className="p-6 text-center space-y-4">
                  <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                  <div>
                    <h3 className="font-semibold text-lg">Order Expired</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This order has expired because payment was not received in time. 
                      Please place a new order to continue.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/')}
                    className="w-full"
                  >
                    Place New Order
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payment Status Message for Bank Transfer */}
            {isBankTransfer && !order.payment_confirmed && !isExpired && hasClaim && (
              <Card className="bg-primary/5 border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <ChefHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">Preparing Your Order</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Your order is being prepared in the kitchen while we confirm your payment. 
                        You'll be notified once payment is verified.
                      </p>
                    </div>
                  </div>
                  {paymentClaims[0]?.proof_url && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Your uploaded proof:</p>
                      <img
                        src={paymentClaims[0].proof_url}
                        alt="Payment proof"
                        className="w-full max-w-xs h-auto rounded-md border"
                      />
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

          </>
        )}
      </div>
    </div>
  );
}
