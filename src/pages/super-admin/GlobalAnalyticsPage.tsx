import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageTitle from "@/components/layout/PageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Users, ShoppingCart, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { formatNaira } from "@/lib/currency";

export default function GlobalAnalyticsPage() {
  // Fetch global stats
  const { data: stats } = useQuery({
    queryKey: ["super-admin-global-stats"],
    queryFn: async () => {
      const [
        tenantsResult,
        usersResult,
        ordersResult,
        revenueResult,
      ] = await Promise.all([
        supabase.from("venues").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total_kobo").eq("payment_confirmed", true),
      ]);

      const totalRevenue = revenueResult.data?.reduce((sum, o) => sum + (o.total_kobo || 0), 0) || 0;

      return {
        tenants: tenantsResult.count || 0,
        users: usersResult.count || 0,
        orders: ordersResult.count || 0,
        revenue: totalRevenue,
      };
    },
  });

  // Fetch revenue per tenant
  const { data: revenueByTenant, isLoading: revenueLoading } = useQuery({
    queryKey: ["super-admin-revenue-by-tenant"],
    queryFn: async () => {
      const { data: venues } = await supabase.from("venues").select("id, name");
      
      if (!venues) return [];

      const results = await Promise.all(
        venues.map(async (venue) => {
          const { data: orders } = await supabase
            .from("orders")
            .select("total_kobo")
            .eq("venue_id", venue.id)
            .eq("payment_confirmed", true);

          const { count: orderCount } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("venue_id", venue.id);

          const revenue = orders?.reduce((sum, o) => sum + (o.total_kobo || 0), 0) || 0;

          return {
            id: venue.id,
            name: venue.name,
            orders: orderCount || 0,
            revenue,
          };
        })
      );

      return results.sort((a, b) => b.revenue - a.revenue);
    },
  });

  // Fetch orders by tenant for chart
  const { data: ordersByTenant } = useQuery({
    queryKey: ["super-admin-orders-by-tenant"],
    queryFn: async () => {
      const { data: venues } = await supabase.from("venues").select("id, name");
      
      if (!venues) return [];

      const results = await Promise.all(
        venues.map(async (venue) => {
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("venue_id", venue.id);

          return {
            name: venue.name,
            orders: count || 0,
          };
        })
      );

      return results.filter((r) => r.orders > 0).sort((a, b) => b.orders - a.orders).slice(0, 10);
    },
  });

  // Fetch order status distribution
  const { data: statusDistribution } = useQuery({
    queryKey: ["super-admin-status-distribution"],
    queryFn: async () => {
      const statuses: Array<"pending_payment" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"> = 
        ["pending_payment", "confirmed", "preparing", "ready", "completed", "cancelled"];
      const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--destructive))"];
      
      const results = await Promise.all(
        statuses.map(async (status, index) => {
          const { count } = await supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", status);

          return {
            name: status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            value: count || 0,
            color: colors[index],
          };
        })
      );

      return results.filter((r) => r.value > 0);
    },
  });

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Global Analytics" subtitle="Platform-wide metrics and insights" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tenants || 0}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-primary" />
              Active businesses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users || 0}</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orders || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNaira(stats?.revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Confirmed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Orders by Tenant</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersByTenant && ordersByTenant.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersByTenant}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution && statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Per Tenant Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Tenant</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenueLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : revenueByTenant?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No revenue data
                  </TableCell>
                </TableRow>
              ) : (
                revenueByTenant?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-right">{tenant.orders}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNaira(tenant.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
