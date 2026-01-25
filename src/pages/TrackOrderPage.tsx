import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
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
  Search
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'Order Received', icon: Clock, color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
  ready: { label: 'Ready', icon: Bell, color: 'bg-green-500' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'bg-gray-500' },
  cancelled: { label: 'Cancelled', icon: Clock, color: 'bg-red-500' },
};

export default function TrackOrderPage() {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const [searchRef, setSearchRef] = useState(reference || '');
  
  const { data: order, isLoading, refetch } = useOrder(searchRef);

  const handleSearch = () => {
    if (searchRef.trim()) {
      navigate(`/track/${searchRef.trim().toUpperCase()}`);
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Search */}
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

        {isLoading && searchRef && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && searchRef && !order && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No order found with reference "{searchRef}"
              </p>
            </CardContent>
          </Card>
        )}

        {order && (
          <>
            {/* Order Status */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{order.order_reference}</CardTitle>
                  <Badge variant={order.payment_confirmed ? 'default' : 'secondary'}>
                    {order.payment_confirmed ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {(() => {
                    const status = statusConfig[order.status];
                    const StatusIcon = status.icon;
                    return (
                      <>
                        <div className={`p-2 rounded-full ${status.color} text-white`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{status.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Table {order.table_number}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
