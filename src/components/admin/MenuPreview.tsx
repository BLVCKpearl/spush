import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatNaira } from '@/lib/currency';
import type { MenuItem, Category } from '@/types/database';

interface MenuPreviewProps {
  items: MenuItem[];
  categories: Category[];
}

export default function MenuPreview({ items, categories }: MenuPreviewProps) {
  // Filter to only show available items and group by category
  const availableItems = items.filter((item) => item.is_available);
  
  const groupedItems = categories
    .sort((a, b) => a.display_order - b.display_order)
    .map((category) => ({
      category,
      items: availableItems
        .filter((item) => item.category_id === category.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((group) => group.items.length > 0);

  if (groupedItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No available items to display
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedItems.map(({ category, items: categoryItems }) => (
        <div key={category.id}>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
            {category.name}
          </h3>
          <div className="space-y-2">
            {categoryItems.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-sm whitespace-nowrap">
                      {formatNaira(item.price_kobo)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
