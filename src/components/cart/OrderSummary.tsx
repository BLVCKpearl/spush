import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatNaira } from '@/lib/currency';
import type { CartItem } from '@/types/database';

interface OrderSummaryProps {
  items: CartItem[];
  totalKobo: number;
}

export const OrderSummary = memo(function OrderSummary({ 
  items, 
  totalKobo 
}: OrderSummaryProps) {
  const summaryItems = useMemo(() => 
    items.map(item => ({
      id: item.menuItem.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      subtotalKobo: item.menuItem.price_kobo * item.quantity,
    })),
    [items]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {summaryItems.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.name} × {item.quantity}
            </span>
            <span className="tabular-nums">{formatNaira(item.subtotalKobo)}</span>
          </div>
        ))}
        <Separator className="my-3" />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span className="tabular-nums">{formatNaira(totalKobo)}</span>
        </div>
      </CardContent>
    </Card>
  );
});
