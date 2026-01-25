import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatNaira } from '@/lib/currency';
import type { CartItem } from '@/types/database';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const CartItemCard = memo(function CartItemCard({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: CartItemCardProps) {
  const { menuItem, quantity } = item;
  const subtotalKobo = menuItem.price_kobo * quantity;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium leading-tight">{menuItem.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatNaira(menuItem.price_kobo)} each
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <Button 
                size="icon" 
                variant="outline"
                className="h-8 w-8"
                onClick={() => onUpdateQuantity(quantity - 1)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center font-medium tabular-nums">
                {quantity}
              </span>
              <Button 
                size="icon" 
                variant="outline"
                className="h-8 w-8"
                onClick={() => onUpdateQuantity(quantity + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-destructive hover:text-destructive px-2"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-semibold tabular-nums">
            {formatNaira(subtotalKobo)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});
