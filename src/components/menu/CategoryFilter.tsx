import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Category } from '@/types/database';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function CategoryFilter({ 
  categories, 
  selectedCategoryId, 
  onSelect 
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <Button
          variant={selectedCategoryId === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(null)}
          className="flex-shrink-0"
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(category.id)}
            className="flex-shrink-0"
          >
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
