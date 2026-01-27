import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useTodayAnalytics, useServedOrders } from '@/hooks/useAnalytics';
import { formatNaira } from '@/lib/currency';
import { TrendingUp, ShoppingCart, DollarSign, Loader2 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { tenantId } = useAuth();
  
  // Scope analytics to current tenant
  const { data: analytics, isLoading } = useTodayAnalytics(tenantId);
  const { data: servedOrders, isLoading: servedLoading } = useServedOrders(tenantId);

  if (!tenantId) {
    return (
      <AdminLayout title="Analytics" requiredPermission="canAccessAnalytics">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No tenant context available.
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics" requiredPermission="canAccessAnalytics">
      <div className="space-y-6">
        {/* Today's Stats Header */}
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Today's Performance</h3>
          <span className="text-sm text-muted-foreground">
            ({new Date().toLocaleDateString('en-NG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })})
          </span>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Paid Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.paidOrdersCount ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground">Orders with confirmed payment</p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatNaira(analytics?.totalRevenueKobo ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Sum of all paid orders today</p>
            </CardContent>
          </Card>

          {/* Average Order Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {formatNaira(analytics?.averageOrderValueKobo ?? 0)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Revenue per order</p>
            </CardContent>
          </Card>
        </div>

        {/* Served Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Served Orders Today</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Order Ref</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servedLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !servedOrders || servedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No served orders yet today
                    </TableCell>
                  </TableRow>
                ) : (
                  servedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.table_label || `Table ${order.table_number}`}</TableCell>
                      <TableCell className="font-mono text-sm">{order.order_reference}</TableCell>
                      <TableCell className="text-right font-medium">{formatNaira(order.total_kobo)}</TableCell>
                      <TableCell>
                        <Badge variant={order.payment_method === 'bank_transfer' ? 'secondary' : 'outline'}>
                          {order.payment_method === 'bank_transfer' ? 'Transfer' : 'Cash'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
