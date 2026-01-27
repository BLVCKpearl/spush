import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CreditCard, Banknote, CheckCircle2, ChefHat, Bell } from 'lucide-react';
import type { OrderWithItems } from '@/types/database';
import OrderQueueCard from './OrderQueueCard';

interface OrderStatusTabsProps {
  orders: OrderWithItems[];
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onStatusUpdate: (orderId: string, status: string) => void;
  isUpdating: boolean;
}

const tabConfig = [
  { 
    value: 'pending_transfer', 
    label: 'Pending Transfer', 
    icon: CreditCard,
    filter: (o: OrderWithItems) => o.status === 'pending_payment' && o.payment_method === 'bank_transfer'
  },
  { 
    value: 'cash', 
    label: 'Cash Orders', 
    icon: Banknote,
    filter: (o: OrderWithItems) => o.status === 'cash_on_delivery'
  },
  { 
    value: 'confirmed', 
    label: 'Paid', 
    icon: CheckCircle2,
    filter: (o: OrderWithItems) => o.status === 'confirmed'
  },
  { 
    value: 'preparing', 
    label: 'Preparing', 
    icon: ChefHat,
    filter: (o: OrderWithItems) => o.status === 'preparing'
  },
  { 
    value: 'ready', 
    label: 'Ready', 
    icon: Bell,
    filter: (o: OrderWithItems) => o.status === 'ready'
  },
];

export default function OrderStatusTabs({
  orders,
  isLoading,
  activeTab,
  onTabChange,
  onStatusUpdate,
  isUpdating,
}: OrderStatusTabsProps) {
  const getFilteredOrders = (filterFn: (o: OrderWithItems) => boolean) => {
    return orders.filter(filterFn).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1.5 md:p-2">
        {tabConfig.map((tab) => {
          const count = getFilteredOrders(tab.filter).length;
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex-1 min-w-[100px] md:min-w-[120px] px-2 py-2.5 md:py-3 text-xs md:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              <span className="truncate">{tab.label}</span>
              {count > 0 && (
                <span className="ml-1.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-xs font-medium">
                  {count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {tabConfig.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <OrderGrid
              orders={getFilteredOrders(tab.filter)}
              onStatusUpdate={onStatusUpdate}
              isUpdating={isUpdating}
              emptyMessage={`No ${tab.label.toLowerCase()}`}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface OrderGridProps {
  orders: OrderWithItems[];
  onStatusUpdate: (orderId: string, status: string) => void;
  isUpdating: boolean;
  emptyMessage: string;
}

function OrderGrid({ orders, onStatusUpdate, isUpdating, emptyMessage }: OrderGridProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => (
        <OrderQueueCard
          key={order.id}
          order={order}
          onStatusUpdate={onStatusUpdate}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}
