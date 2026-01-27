import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatNaira } from '@/lib/currency';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bell,
  Utensils,
  XCircle,
  Banknote,
  CreditCard,
  FileText,
} from 'lucide-react';
import { usePaymentClaims } from '@/hooks/usePaymentClaims';
import { useCreatePaymentConfirmation } from '@/hooks/usePaymentConfirmations';
import PaymentConfirmDialog from './PaymentConfirmDialog';
import { toast } from 'sonner';
import type { OrderStatus, OrderWithItems } from '@/types/database';

interface OrderQueueCardProps {
  order: OrderWithItems;
  onStatusUpdate: (orderId: string, status: string) => void;
  isUpdating: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-muted text-muted-foreground' },
  pending_payment: { label: 'Awaiting Payment', icon: CreditCard, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  cash_on_delivery: { label: 'Cash on Delivery', icon: Banknote, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  confirmed: { label: 'Paid', icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  ready: { label: 'Ready', icon: Bell, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  completed: { label: 'Served', icon: Utensils, color: 'bg-muted text-muted-foreground' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
  expired: { label: 'Expired', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
};

export default function OrderQueueCard({
  order,
  onStatusUpdate,
  isUpdating,
}: OrderQueueCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const { data: paymentClaims } = usePaymentClaims(order.id);
  const createConfirmation = useCreatePaymentConfirmation();
  
  const latestClaim = paymentClaims?.[0] || null;
  const hasClaim = !!latestClaim;

  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { addSuffix: true });

  // Summarize items
  const itemsSummary = order.order_items
    .map((item) => `${item.quantity}× ${item.item_snapshot?.name || item.menu_items?.name || 'Item'}`)
    .join(', ');

  const handleConfirmPayment = async (notes?: string) => {
    try {
      await createConfirmation.mutateAsync({
        orderId: order.id,
        method: 'manual',
        notes,
      });
      toast.success('Payment confirmed');
      setShowConfirmDialog(false);
    } catch (error) {
      toast.error('Failed to confirm payment');
    }
  };

  // Determine available actions based on current status
  const getActions = () => {
    const actions: { label: string; status?: OrderStatus; variant: 'default' | 'outline' | 'destructive'; icon: React.ElementType; onClick: () => void }[] = [];

    // Confirm Payment - available for pending_payment and cash_on_delivery if not confirmed
    if (!order.payment_confirmed && (order.status === 'pending_payment' || order.status === 'cash_on_delivery')) {
      actions.push({
        label: hasClaim ? 'Review & Confirm' : 'Confirm Payment',
        variant: 'default',
        icon: hasClaim ? FileText : CheckCircle2,
        onClick: () => setShowConfirmDialog(true),
      });
    }

    // Status progression actions
    if (order.status === 'confirmed') {
      actions.push({
        label: 'Set Preparing',
        status: 'preparing',
        variant: 'outline',
        icon: ChefHat,
        onClick: () => onStatusUpdate(order.id, 'preparing'),
      });
    }

    if (order.status === 'preparing') {
      actions.push({
        label: 'Set Ready',
        status: 'ready',
        variant: 'outline',
        icon: Bell,
        onClick: () => onStatusUpdate(order.id, 'ready'),
      });
    }

    if (order.status === 'ready') {
      actions.push({
        label: 'Set Served',
        status: 'completed',
        variant: 'default',
        icon: Utensils,
        onClick: () => onStatusUpdate(order.id, 'completed'),
      });
    }

    // Cancel action - available for active orders
    if (!['completed', 'cancelled', 'expired'].includes(order.status)) {
      actions.push({
        label: 'Cancel',
        status: 'cancelled',
        variant: 'destructive',
        icon: XCircle,
        onClick: () => onStatusUpdate(order.id, 'cancelled'),
      });
    }

    return actions;
  };

  const actions = getActions();

  return (
    <>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2 space-y-2">
          {/* Time and Status Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeAgo}</span>
            </div>
            <Badge className={`${status.color} border-0 gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Table and Reference Row */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{order.table_label || `T${order.table_number}`}</span>
              <span className="text-sm text-muted-foreground font-mono">{order.order_reference}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasClaim && (order.status === 'pending_payment') && (
                <Badge className="gap-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Transfer Initiated
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 shrink-0">
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
                {order.payment_confirmed && <CheckCircle2 className="h-3 w-3 text-green-600" />}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col pt-2">
          {/* Items Summary */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{itemsSummary}</p>

          <Separator className="my-2" />

          {/* Total */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">{formatNaira(order.total_kobo)}</span>
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-auto pt-2">
              {actions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={idx}
                    variant={action.variant}
                    size="sm"
                    onClick={action.onClick}
                    disabled={isUpdating || createConfirmation.isPending}
                    className="flex-1 min-w-[100px]"
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        order={order}
        paymentClaim={latestClaim}
        onConfirm={handleConfirmPayment}
        isConfirming={createConfirmation.isPending}
      />
    </>
  );
}
