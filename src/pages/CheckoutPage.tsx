import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useTableSession } from '@/hooks/useTableSession';
import { useCreateOrder } from '@/hooks/useOrders';
import { usePersistedIdempotencyKey, clearStoredIdempotencyKey } from '@/hooks/useIdempotency';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import GuestHeader from '@/components/layout/GuestHeader';
import type { PaymentMethod } from '@/types/database';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { session } = useTableSession();
  const { items, getTotalKobo, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const { idempotencyKey, clearKey } = usePersistedIdempotencyKey();
  
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Redirect if no valid session or empty cart
  if (!session || items.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Your cart is empty or session expired.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    try {
      // Extract table number from label (e.g., "Table 5" -> 5)
      const tableNumberMatch = session.tableLabel.match(/\d+/);
      const effectiveTableNumber = tableNumberMatch ? parseInt(tableNumberMatch[0], 10) : 1;

      const order = await createOrder.mutateAsync({
        venueId: session.venueId,
        tableId: session.tableId,
        tableNumber: effectiveTableNumber,
        customerName: customerName.trim() || undefined,
        paymentMethod,
        items,
        idempotencyKey, // Prevent duplicate orders
      });

      clearCart();
      clearKey(); // Clear idempotency key after successful order
      clearStoredIdempotencyKey();
      toast.success('Order placed successfully!');
      // Redirect to confirmation page with order reference
      navigate(`/order-confirmation/${order.order_reference}`);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      // Show specific error message for rate limiting
      if (error?.message?.includes('Too many orders')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to place order. Please try again.');
      }
    }
  };

  const totalKobo = getTotalKobo();

  return (
    <div className="min-h-screen bg-background pb-24">
      <GuestHeader 
        title="Checkout" 
        subtitle={session.tableLabel}
        showBack 
      />

      <main className="p-4 space-y-4">
        {/* Customer Name */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This helps staff identify your order
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <label 
                htmlFor="bank_transfer" 
                className="flex items-center space-x-3 border-2 border-primary rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors relative"
              >
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <div className="flex items-center gap-3 flex-1">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      Bank Transfer
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pay via bank transfer
                    </p>
                  </div>
                </div>
              </label>
              <label 
                htmlFor="cash" 
                className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <RadioGroupItem value="cash" id="cash" />
                <div className="flex items-center gap-3 flex-1">
                  <Banknote className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Pay with Cash</p>
                    <p className="text-sm text-muted-foreground">
                      Pay the waiter at your table
                    </p>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {items.map((item) => (
              <div key={item.menuItem.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.menuItem.name} × {item.quantity}
                </span>
                <span className="tabular-nums">
                  {formatNaira(item.menuItem.price_kobo * item.quantity)}
                </span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="tabular-nums">{formatNaira(totalKobo)}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-pb">
        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={handlePlaceOrder}
          disabled={createOrder.isPending}
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            `Confirm Order · ${formatNaira(totalKobo)}`
          )}
        </Button>
      </div>
    </div>
  );
}
