import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTableSession, getStoredSession } from '@/hooks/useTableSession';
import { useCategories, useVenueMenuItems, useMenuItems } from '@/hooks/useMenu';
import { useCart } from '@/contexts/CartContext';
import { formatNaira } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { MenuSearch } from '@/components/menu/MenuSearch';
import { CategoryFilter } from '@/components/menu/CategoryFilter';
import type { MenuItem } from '@/types/database';

export default function VenueMenuPage() {
  const { venueSlug } = useParams<{ venueSlug: string }>();
  const navigate = useNavigate();
  const { session } = useTableSession();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const { 
    items: cartItems, 
    addItem, 
    updateQuantity,
    getTotalItems,
    getTotalKobo 
  } = useCart();
  
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  // Try venue-specific items first, fall back to all items
  const { data: venueMenuItems, isLoading: venueMenuLoading } = useVenueMenuItems(session?.venueId);
  const { data: allMenuItems, isLoading: allMenuLoading } = useMenuItems();
  
  // Use venue items if available, otherwise use all available items
  const menuItems = venueMenuItems && venueMenuItems.length > 0 ? venueMenuItems : allMenuItems;
  const menuLoading = venueMenuLoading || allMenuLoading;

  // Validate session matches the venue
  useEffect(() => {
    const storedSession = getStoredSession();
    if (!storedSession || storedSession.venueSlug !== venueSlug) {
      navigate('/', { replace: true });
    }
  }, [venueSlug, navigate]);

  // Filter menu items based on search and category
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    let filtered = menuItems;
    
    // Filter by category
    if (selectedCategoryId) {
      filtered = filtered.filter(item => item.category_id === selectedCategoryId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [menuItems, selectedCategoryId, searchQuery]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const categoryId = item.category_id;
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(item);
      return acc;
    }, {} as Record<string, typeof filteredItems>);
  }, [filteredItems]);

  if (!session || session.venueSlug !== venueSlug) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Session Not Found</h1>
            <p className="text-muted-foreground mb-4">
              Please scan the QR code on your table to start ordering.
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
    if (!menuItem.is_available) return;
    addItem(menuItem);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    const currentQty = getItemQuantity(itemId);
    updateQuantity(itemId, currentQty + delta);
  };

  if (categoriesLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold">{session.venueName}</h1>
            <p className="text-sm text-muted-foreground">{session.tableLabel}</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {getTotalItems()} items
          </Badge>
        </div>
        
        {/* Search */}
        <MenuSearch value={searchQuery} onChange={setSearchQuery} />
        
        {/* Category Filter */}
        {categories && categories.length > 0 && (
          <div className="mt-3">
            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </div>
        )}
      </header>

      {/* Menu Content */}
      <main className="p-4 space-y-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategoryId 
                ? 'No items match your search' 
                : 'No menu items available'}
            </p>
            {(searchQuery || selectedCategoryId) && (
              <Button 
                variant="link" 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId(null);
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : selectedCategoryId ? (
          // Show flat list when category is selected
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                quantity={getItemQuantity(item.id)}
                onAdd={() => handleAddItem(item)}
                onIncrement={() => handleUpdateQuantity(item.id, 1)}
                onDecrement={() => handleUpdateQuantity(item.id, -1)}
              />
            ))}
          </div>
        ) : (
          // Show grouped by category when no category filter
          categories?.map((category) => {
            const categoryItems = groupedItems[category.id];
            if (!categoryItems || categoryItems.length === 0) return null;
            
            return (
              <section key={category.id}>
                <h2 className="text-lg font-semibold mb-3">{category.name}</h2>
                <div className="space-y-3">
                  {categoryItems.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      quantity={getItemQuantity(item.id)}
                      onAdd={() => handleAddItem(item)}
                      onIncrement={() => handleUpdateQuantity(item.id, 1)}
                      onDecrement={() => handleUpdateQuantity(item.id, -1)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Cart Footer */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-pb">
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
