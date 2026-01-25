import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import OrderStatusTabs from '@/components/admin/OrderStatusTabs';
import { toast } from 'sonner';
import type { OrderStatus } from '@/types/database';

export default function AdminOrdersPage() {
  // Both admin and staff can access this page
  useRequireAuth('any');
  
  const [activeTab, setActiveTab] = useState<string>('pending_transfer');
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus as OrderStatus });
      toast.success(`Order status updated`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  return (
    <AdminLayout title="Order Queue">
      <OrderStatusTabs
        orders={orders || []}
        isLoading={isLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={updateStatus.isPending}
      />
    </AdminLayout>
  );
}
