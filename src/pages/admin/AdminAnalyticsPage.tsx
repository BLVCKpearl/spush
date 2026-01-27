import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTodayAnalytics, useServedOrders } from '@/hooks/useAnalytics';
import { formatNaira } from '@/lib/currency';
import { TrendingUp, ShoppingCart, DollarSign, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';

type SortField = 'created_at' | 'total_kobo' | 'table_label';
type SortDirection = 'asc' | 'desc';
type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function AdminAnalyticsPage() {
  const { tenantId } = useAuth();
  
  // Filter and sorting state
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Scope analytics to current tenant
  const { data: analytics, isLoading } = useTodayAnalytics(tenantId);
  const { data: servedOrders, isLoading: servedLoading } = useServedOrders(tenantId, dateFilter);

  // Sort the orders
  const sortedOrders = [...(servedOrders || [])].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'total_kobo':
        comparison = a.total_kobo - b.total_kobo;
        break;
      case 'table_label':
        const labelA = a.table_label || `Table ${a.table_number}`;
        const labelB = b.table_label || `Table ${b.table_number}`;
        comparison = labelA.localeCompare(labelB);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

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
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base">Served Orders</CardTitle>
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('table_label')}
                    >
                      Table
                      <SortIcon field="table_label" />
                    </Button>
                  </TableHead>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('total_kobo')}
                    >
                      Amount
                      <SortIcon field="total_kobo" />
                    </Button>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-medium hover:bg-transparent"
                      onClick={() => handleSort('created_at')}
                    >
                      Time
                      <SortIcon field="created_at" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servedLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !sortedOrders || sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No served orders for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.table_label || `Table ${order.table_number}`}</TableCell>
                      <TableCell className="font-mono text-sm">{order.order_reference}</TableCell>
                      <TableCell className="font-medium">{formatNaira(order.total_kobo)}</TableCell>
                      <TableCell>
                        <Badge variant={order.payment_method === 'bank_transfer' ? 'secondary' : 'outline'}>
                          {order.payment_method === 'bank_transfer' ? 'Transfer' : 'Cash'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.created_at), 'HH:mm')}
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
