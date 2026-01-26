import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import OrderStatusTabs from '@/components/admin/OrderStatusTabs';
import { toast } from 'sonner';
import type { OrderStatus } from '@/types/database';

export default function AdminOrdersPage() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('pending_transfer');
  
  // Scope orders to current tenant
  const { data: orders, isLoading } = useOrders(tenantId);
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
    <AdminLayout title="Order Queue" requiredPermission="canAccessOrders">
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
