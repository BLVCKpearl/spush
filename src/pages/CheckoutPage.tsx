import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PaymentMethod } from '@/types/database';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, tableNumber, getTotalKobo, clearCart } = useCart();
  const createOrder = useCreateOrder();
  
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  if (!tableNumber || items.length === 0) {
    navigate('/order');
    return null;
  }

  const handlePlaceOrder = async () => {
    try {
      const order = await createOrder.mutateAsync({
        tableNumber,
        customerName: customerName.trim() || undefined,
        paymentMethod,
        items,
      });

      clearCart();
      navigate(`/order-confirmation/${order.order_reference}`);
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error('Failed to place order:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Checkout</h1>
            <p className="text-sm text-muted-foreground">Table {tableNumber}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Customer Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This helps staff identify your order
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Bank Transfer</p>
                      <p className="text-sm text-muted-foreground">
                        Pay via bank transfer
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 border rounded-lg p-4">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Banknote className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Pay with Cash</p>
                      <p className="text-sm text-muted-foreground">
                        Pay the waiter at your table
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.menuItem.id} className="flex justify-between text-sm">
                <span>{item.menuItem.name} × {item.quantity}</span>
                <span>{formatNaira(item.menuItem.price_kobo * item.quantity)}</span>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatNaira(getTotalKobo())}</span>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full h-12 text-base"
          onClick={handlePlaceOrder}
          disabled={createOrder.isPending}
        >
          {createOrder.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Placing Order...
            </>
          ) : (
            `Place Order - ${formatNaira(getTotalKobo())}`
          )}
        </Button>
      </div>
    </div>
  );
}
