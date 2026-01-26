import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import StagingOnlyRoute from "@/components/auth/StagingOnlyRoute";
import Index from "./pages/Index";
import OrderPage from "./pages/OrderPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import VenueTableResolver from "./pages/VenueTableResolver";
import VenueMenuPage from "./pages/VenueMenuPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminMenuPage from "./pages/admin/AdminMenuPage";
import AdminBankDetailsPage from "./pages/admin/AdminBankDetailsPage";
import AdminRolesPage from "./pages/admin/AdminRolesPage";
import AdminTablesPage from "./pages/admin/AdminTablesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminAccountPage from "./pages/admin/AdminAccountPage";
import AdminForceResetPage from "./pages/admin/AdminForceResetPage";
import AdminAuthTestPage from "./pages/admin/AdminAuthTestPage";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import TenantsPage from "./pages/super-admin/TenantsPage";
import AllUsersPage from "./pages/super-admin/AllUsersPage";
import GlobalAnalyticsPage from "./pages/super-admin/GlobalAnalyticsPage";
import SettingsPage from "./pages/super-admin/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/v/:venueSlug" element={<VenueTableResolver />} />
              <Route path="/menu/:venueSlug" element={<VenueMenuPage />} />
              <Route path="/order" element={<OrderPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route
                path="/order-confirmation/:reference"
                element={<OrderConfirmationPage />}
              />
              <Route path="/order/:reference" element={<TrackOrderPage />} />
              <Route path="/track" element={<TrackOrderPage />} />
              <Route path="/track/:reference" element={<TrackOrderPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
              <Route path="/admin/" element={<Navigate to="/admin/orders" replace />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/menu" element={<AdminMenuPage />} />
              <Route path="/admin/bank-details" element={<AdminBankDetailsPage />} />
              <Route path="/admin/roles" element={<AdminRolesPage />} />
              <Route path="/admin/tables" element={<AdminTablesPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/account" element={<AdminAccountPage />} />
              <Route path="/admin/force-reset" element={<AdminForceResetPage />} />
              <Route path="/admin/auth-test" element={
                <StagingOnlyRoute>
                  <AdminAuthTestPage />
                </StagingOnlyRoute>
              } />
              {/* Super Admin Routes */}
              <Route path="/super-admin" element={<SuperAdminDashboard />}>
                <Route index element={<Navigate to="/super-admin/tenants" replace />} />
                <Route path="tenants" element={<TenantsPage />} />
                <Route path="users" element={<AllUsersPage />} />
                <Route path="analytics" element={<GlobalAnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
