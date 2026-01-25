import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus, useConfirmPayment } from '@/hooks/useOrders';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  Bell, 
  Image as ImageIcon,
  Loader2,
  Banknote,
  CreditCard,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import type { OrderStatus, OrderWithItems } from '@/types/database';

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', icon: Clock, variant: 'secondary' },
  pending_payment: { label: 'Awaiting Payment', icon: CreditCard, variant: 'outline' },
  cash_on_delivery: { label: 'Cash on Delivery', icon: Banknote, variant: 'outline' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, variant: 'default' },
  preparing: { label: 'Preparing', icon: ChefHat, variant: 'outline' },
  ready: { label: 'Ready', icon: Bell, variant: 'default' },
  completed: { label: 'Completed', icon: CheckCircle2, variant: 'secondary' },
  cancelled: { label: 'Cancelled', icon: XCircle, variant: 'destructive' },
  expired: { label: 'Expired', icon: AlertTriangle, variant: 'destructive' },
};

const statusFlow: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab] = useState<string>('active');
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const confirmPayment = useConfirmPayment();

  const activeOrders = orders?.filter(
    (o) => !['completed', 'cancelled', 'expired'].includes(o.status)
  ) || [];
  
  const completedOrders = orders?.filter(
    (o) => ['completed', 'cancelled', 'expired'].includes(o.status)
  ) || [];

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await confirmPayment.mutateAsync(orderId);
      toast.success('Payment confirmed');
    } catch (error) {
      toast.error('Failed to confirm payment');
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null;
    return statusFlow[currentIndex + 1];
  };

  return (
    <AdminLayout title="Orders">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active orders
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onConfirmPayment={handleConfirmPayment}
                getNextStatus={getNextStatus}
                isUpdating={updateStatus.isPending || confirmPayment.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No completed orders
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusUpdate={handleStatusUpdate}
                onConfirmPayment={handleConfirmPayment}
                getNextStatus={getNextStatus}
                isUpdating={updateStatus.isPending || confirmPayment.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

interface OrderCardProps {
  order: OrderWithItems;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
  onConfirmPayment: (orderId: string) => void;
  getNextStatus: (status: OrderStatus) => OrderStatus | null;
  isUpdating: boolean;
}

function OrderCard({ 
  order, 
  onStatusUpdate, 
  onConfirmPayment, 
  getNextStatus,
  isUpdating 
}: OrderCardProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;
  const nextStatus = getNextStatus(order.status);
  const hasProof = order.payment_proofs && order.payment_proofs.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{order.order_reference}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Table {order.table_number}
              {order.customer_name && ` • ${order.customer_name}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={status.variant}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant={order.payment_confirmed ? 'default' : 'secondary'}>
              {order.payment_method === 'cash' ? 'Cash' : 'Bank Transfer'}
              {order.payment_confirmed ? ' ✓' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.menu_items.name} × {item.quantity}
              </span>
              <span>{formatNaira(item.unit_price_kobo * item.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatNaira(order.total_kobo)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {/* Only show confirm payment if order is not expired */}
          {!order.payment_confirmed && order.status !== 'expired' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onConfirmPayment(order.id)}
              disabled={isUpdating}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirm Payment
            </Button>
          )}

          {hasProof && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  View Proof
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Payment Proof</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <img 
                    src={order.payment_proofs![0].image_url} 
                    alt="Payment proof" 
                    className="w-full rounded-lg"
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {nextStatus && (
            <Button 
              size="sm"
              onClick={() => onStatusUpdate(order.id, nextStatus)}
              disabled={isUpdating}
            >
              Mark as {statusConfig[nextStatus].label}
            </Button>
          )}

          {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'expired' && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onStatusUpdate(order.id, 'cancelled')}
              disabled={isUpdating}
            >
              Cancel Order
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Placed {new Date(order.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
