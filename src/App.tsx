import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
            <Route path="/order-confirmation/:reference" element={<OrderConfirmationPage />} />
            <Route path="/order/:reference" element={<TrackOrderPage />} />
            <Route path="/track" element={<TrackOrderPage />} />
            <Route path="/track/:reference" element={<TrackOrderPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/admin/menu" element={<AdminMenuPage />} />
            <Route path="/admin/bank-details" element={<AdminBankDetailsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
