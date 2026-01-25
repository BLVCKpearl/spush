import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const { 
    items, 
    tableNumber, 
    updateQuantity, 
    removeItem, 
    getTotalKobo 
  } = useCart();

  if (!tableNumber) {
    navigate('/order');
    return null;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        </header>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => navigate(`/order?table=${tableNumber}`)}>
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Your Cart</h1>
            <p className="text-sm text-muted-foreground">Table {tableNumber}</p>
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <main className="p-4 space-y-4">
        {items.map((cartItem) => (
          <Card key={cartItem.menuItem.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{cartItem.menuItem.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatNaira(cartItem.menuItem.price_kobo)} each
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => updateQuantity(cartItem.menuItem.id, cartItem.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive"
                    onClick={() => removeItem(cartItem.menuItem.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  {formatNaira(cartItem.menuItem.price_kobo * cartItem.quantity)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

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

      {/* Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <Button 
          className="w-full h-12 text-base"
          onClick={() => navigate('/checkout')}
        >
          Proceed to Checkout - {formatNaira(getTotalKobo())}
        </Button>
      </div>
    </div>
  );
}
