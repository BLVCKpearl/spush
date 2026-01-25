import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useCategories, useMenuItems } from '@/hooks/useMenu';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import type { MenuItem } from '@/types/database';

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tableParam = searchParams.get('table');
  
  const { 
    items: cartItems, 
    tableNumber, 
    setTableNumber, 
    addItem, 
    updateQuantity,
    getTotalItems,
    getTotalKobo 
  } = useCart();
  
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();

  useEffect(() => {
    if (tableParam) {
      const table = parseInt(tableParam, 10);
      if (!isNaN(table) && table > 0) {
        setTableNumber(table);
      }
    }
  }, [tableParam, setTableNumber]);

  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">Welcome!</h1>
            <p className="text-muted-foreground mb-4">
              Please scan the QR code on your table to start ordering.
            </p>
            <p className="text-sm text-muted-foreground">
              Or ask a staff member for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getItemQuantity = (itemId: string) => {
    const cartItem = cartItems.find((item) => item.menuItem.id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleAddItem = (menuItem: MenuItem) => {
    addItem(menuItem);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const currentQty = getItemQuantity(itemId);
    updateQuantity(itemId, currentQty + delta);
  };

  const groupedItems = menuItems?.reduce((acc, item) => {
    const categoryId = item.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  if (categoriesLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Menu</h1>
            <p className="text-sm text-muted-foreground">Table {tableNumber}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {getTotalItems()} items
          </Badge>
        </div>
      </header>

      {/* Menu Content */}
      <main className="p-4">
        {categories && categories.length > 0 ? (
          <Tabs defaultValue={categories[0]?.id} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-4">
              {categories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="whitespace-nowrap"
                >
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-3">
                {groupedItems?.[category.id]?.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={getItemQuantity(item.id)}
                    onAdd={() => handleAddItem(item)}
                    onIncrement={() => handleUpdateQuantity(item.id, 1)}
                    onDecrement={() => handleUpdateQuantity(item.id, -1)}
                  />
                ))}
                {(!groupedItems?.[category.id] || groupedItems[category.id].length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No items available in this category
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No menu items available</p>
          </div>
        )}
      </main>

      {/* Cart Footer */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
          <Button 
            className="w-full h-12 text-base"
            onClick={() => navigate('/cart')}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            View Cart ({getTotalItems()}) - {formatNaira(getTotalKobo())}
          </Button>
        </div>
      )}
    </div>
  );
}

interface MenuItemCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

function MenuItemCard({ item, quantity, onAdd, onIncrement, onDecrement }: MenuItemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">{item.name}</h3>
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
            {quantity === 0 ? (
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
