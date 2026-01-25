import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayAnalytics, useVenues } from '@/hooks/useAnalytics';
import { formatNaira } from '@/lib/currency';
import { TrendingUp, ShoppingCart, DollarSign } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('all');
  
  const { data: venues, isLoading: venuesLoading } = useVenues();
  const { data: analytics, isLoading: analyticsLoading } = useTodayAnalytics(
    selectedVenueId === 'all' ? undefined : selectedVenueId
  );

  const isLoading = venuesLoading || analyticsLoading;

  return (
    <AdminLayout title="Analytics">
      <div className="space-y-6">
        {/* Venue Filter */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground">Filter by venue:</span>
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All venues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All venues</SelectItem>
              {venues?.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
      </div>
    </AdminLayout>
  );
}
