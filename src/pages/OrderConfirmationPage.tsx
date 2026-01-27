import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
import { useBankDetails } from '@/hooks/useBankDetails';
import { useTableSession } from '@/hooks/useTableSession';
import { usePaymentClaims } from '@/hooks/usePaymentClaims';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TransferInitiatedButton } from '@/components/payment/TransferInitiatedButton';
import GuestHeader from '@/components/layout/GuestHeader';
import {
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bell, 
  Loader2,
  Copy,
  Banknote,
  CreditCard,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus } from '@/types/database';

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Order Received', icon: Clock, color: 'bg-yellow-500' },
  pending_payment: { label: 'Awaiting Payment', icon: CreditCard, color: 'bg-amber-500' },
  cash_on_delivery: { label: 'Pay on Delivery', icon: Banknote, color: 'bg-blue-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  ready: { label: 'Ready', icon: Bell, color: 'bg-green-500' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-500' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-500' },
  expired: { label: 'Expired', icon: AlertTriangle, color: 'bg-red-500' },
};

export default function OrderConfirmationPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const { session } = useTableSession();
  
  const { data: order, isLoading } = useOrder(reference || '');
  const { data: bankDetails } = useBankDetails(order?.venue_id);
  const { data: paymentClaims } = usePaymentClaims(order?.id);

  const hasClaim = paymentClaims && paymentClaims.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-4">
              We couldn't find an order with this reference.
            </p>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const isCashPayment = order.payment_method === 'cash';
  const isBankTransfer = order.payment_method === 'bank_transfer';
  const isPendingPayment = order.status === 'pending_payment';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };



  // Use item snapshot for display, fallback to menu_items
  const getItemName = (item: typeof order.order_items[0]) => {
    return item.item_snapshot?.name || item.menu_items?.name || 'Unknown Item';
  };

  const handleBackToMenu = () => {
    if (session) {
      navigate(`/menu/${session.venueSlug}`);
    } else {
      navigate(`/order?table=${order.table_number}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Consistent Guest Header */}
      <GuestHeader 
        title="Order Confirmed" 
        subtitle={order.table_label || `Table ${order.table_number}`}
      />

      <main className="p-4 space-y-4 max-w-md mx-auto">
        {/* Success Banner */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Order Placed!</h2>
        </div>
        <Card className="border-2 border-primary">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Order Reference</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold tracking-wider text-primary">
                {order.order_reference}
              </p>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => copyToClipboard(order.order_reference, 'Reference')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Save this reference to track your order
            </p>
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${status.color} text-white`}>
                <StatusIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{status.label}</p>
                <p className="text-sm text-muted-foreground">
                  {order.payment_confirmed 
                    ? 'Payment confirmed' 
                    : isCashPayment 
                      ? 'Pay staff when your order arrives'
                      : 'Awaiting payment'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Payment Instructions */}
        {isCashPayment && !order.payment_confirmed && (
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Banknote className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    Pay with Cash
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    A staff member will deliver your order and collect payment of{' '}
                    <span className="font-bold">{formatNaira(order.total_kobo)}</span> at your table.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bank Transfer Details */}
        {isBankTransfer && isPendingPayment && bankDetails && (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Transfer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="bg-background rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bank Name</span>
                  <span className="font-medium">{bankDetails.bank_name}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Account Name</span>
                  <span className="font-medium text-right">{bankDetails.account_name}</span>
                </div>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground">Account Number</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-2xl font-mono tracking-wider">{bankDetails.account_number}</span>
                  </div>
                  <Button 
                    className="w-full mt-2"
                    variant="secondary"
                    size="lg"
                    onClick={() => copyToClipboard(bankDetails.account_number, 'Account number')}
                  >
                    <Copy className="mr-2 h-5 w-5" />
                    Copy Account Number
                  </Button>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount to Transfer</span>
                  <span className="font-bold text-xl text-primary">
                    {formatNaira(order.total_kobo)}
                  </span>
                </div>
              </div>
              
              {/* Reference with big copy button */}
              <div className="bg-amber-100 dark:bg-amber-900 rounded-lg p-4 space-y-3">
                <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                  Use this reference as your transfer narration:
                </p>
                <p className="text-2xl font-bold text-center text-amber-900 dark:text-amber-100 tracking-wider">
                  {order.order_reference}
                </p>
                <Button 
                  className="w-full"
                  onClick={() => copyToClipboard(order.order_reference, 'Reference')}
                >
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Reference
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {getItemName(item)} × {item.quantity}
                </span>
                <span className="tabular-nums">
                  {formatNaira(item.unit_price_kobo * item.quantity)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="tabular-nums">{formatNaira(order.total_kobo)}</span>
            </div>
          </CardContent>
        </Card>

        {/* I've Transferred Button for Bank Transfer */}
        {isBankTransfer && isPendingPayment && !hasClaim && (
          <TransferInitiatedButton 
            orderId={order.id}
            orderReference={order.order_reference}
          />
        )}

        {/* Transfer Initiated Status */}
        {isBankTransfer && isPendingPayment && hasClaim && (
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
                    We've received your notification. Your order is being prepared while we confirm payment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/track/${order.order_reference}`)}
          >
            Track Order Status
          </Button>
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={handleBackToMenu}
          >
            Place Another Order
          </Button>
        </div>
      </main>
    </div>
  );
}
