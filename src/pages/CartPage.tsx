import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useTableSession } from '@/hooks/useTableSession';
import { formatNaira } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { CartItemCard } from '@/components/cart/CartItemCard';
import { OrderSummary } from '@/components/cart/OrderSummary';
import GuestHeader from '@/components/layout/GuestHeader';

export default function CartPage() {
  const navigate = useNavigate();
  const { session } = useTableSession();
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    getTotalKobo 
  } = useCart();

  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    updateQuantity(itemId, quantity);
  }, [updateQuantity]);

  const handleRemove = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  const handleBack = useCallback(() => {
    if (session) {
      navigate(`/menu/${session.venueSlug}`);
    } else {
      navigate('/');
    }
  }, [navigate, session]);

  // Redirect if no valid session
  if (!session) {
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
      <div className="min-h-screen bg-background">
        <GuestHeader 
          title="Your Cart" 
          showBack 
          backUrl={`/menu/${session.venueSlug}`} 
        />
        <div className="text-center py-12 px-4">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={handleBack}>Browse Menu</Button>
        </div>
      </div>
    );
  }

  const totalKobo = getTotalKobo();

  return (
    <div className="min-h-screen bg-background pb-24">
      <GuestHeader 
        title="Your Cart" 
        subtitle={session.tableLabel}
        showBack 
        backUrl={`/menu/${session.venueSlug}`} 
      />

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
