import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus, useConfirmPayment } from '@/hooks/useOrders';
import OrderStatusTabs from '@/components/admin/OrderStatusTabs';
import { toast } from 'sonner';
import type { OrderStatus } from '@/types/database';

export default function AdminOrdersPage() {
  // Both admin and staff can access this page
  const { loading: authLoading } = useRequireAuth('any');
  
  const [activeTab, setActiveTab] = useState<string>('pending_transfer');
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();
  const confirmPayment = useConfirmPayment();

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus as OrderStatus });
      toast.success(`Order status updated`);
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

  return (
    <AdminLayout title="Order Queue">
      <OrderStatusTabs
        orders={orders || []}
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onConfirmPayment={handleConfirmPayment}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={updateStatus.isPending || confirmPayment.isPending}
      />
    </AdminLayout>
  );
}
