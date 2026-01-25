import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { formatNaira } from '@/lib/currency';
import type { MenuItem } from '@/types/database';

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function MenuItemCard({ 
  item, 
  quantity, 
  onAdd, 
  onIncrement, 
  onDecrement 
}: MenuItemCardProps) {
  const isAvailable = item.is_available;

  return (
    <Card className={!isAvailable ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{item.name}</h3>
              {!isAvailable && (
                <Badge variant="secondary" className="text-xs">
                  Unavailable
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            <p className="text-base font-semibold mt-2">
              {formatNaira(item.price_kobo)}
            </p>
          </div>
          <div className="flex-shrink-0">
            {!isAvailable ? (
              <Button size="sm" disabled variant="secondary">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            ) : quantity === 0 ? (
              <Button size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={onDecrement}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button size="icon" variant="outline" onClick={onIncrement}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
