import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useTableSession } from '@/hooks/useTableSession';
import { formatNaira } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { CartItemCard } from '@/components/cart/CartItemCard';
import { OrderSummary } from '@/components/cart/OrderSummary';

export default function CartPage() {
  const navigate = useNavigate();
  const { session } = useTableSession();
  const { 
    items, 
    tableNumber,
    tableSession,
    updateQuantity, 
    removeItem, 
    getTotalKobo 
  } = useCart();

  // Use session from context or hook
  const currentSession = tableSession || session;
  const hasValidSession = currentSession || tableNumber;

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
  }, [updateQuantity]);

  const handleRemove = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  const handleBack = useCallback(() => {
    if (currentSession) {
      navigate(`/menu/${currentSession.venueSlug}`);
    } else if (tableNumber) {
      navigate(`/order?table=${tableNumber}`);
    } else {
      navigate(-1);
    }
  }, [navigate, currentSession, tableNumber]);

  // Redirect if no valid session
  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Please scan the QR code on your table to start ordering.
          </p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="mb-6">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Menu
          </Button>
        </header>
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={handleBack}>Browse Menu</Button>
        </div>
      </div>
    );
  }

  const totalKobo = getTotalKobo();
  const displayLocation = currentSession 
    ? currentSession.tableLabel 
    : `Table ${tableNumber}`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Your Cart</h1>
            <p className="text-sm text-muted-foreground">{displayLocation}</p>
          </div>
        </div>
      </header>

      {/* Cart Items */}
      <main className="p-4 space-y-4">
        {items.map((cartItem) => (
          <CartItemCard
            key={cartItem.menuItem.id}
            item={cartItem}
            onUpdateQuantity={(qty) => handleUpdateQuantity(cartItem.menuItem.id, qty)}
            onRemove={() => handleRemove(cartItem.menuItem.id)}
          />
        ))}

        {/* Order Summary */}
        <OrderSummary items={items} totalKobo={totalKobo} />
      </main>

      {/* Checkout Button - Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-pb">
        <Button 
          className="w-full h-12 text-base font-semibold"
          onClick={() => navigate('/checkout')}
        >
          Checkout · {formatNaira(totalKobo)}
        </Button>
      </div>
    </div>
  );
}
