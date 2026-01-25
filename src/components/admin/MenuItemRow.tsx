import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { formatNaira } from '@/lib/currency';
import { Pencil, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { MenuItem } from '@/types/database';

interface MenuItemRowProps {
  item: MenuItem;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isUpdating: boolean;
}

export default function MenuItemRow({
  item,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onToggleAvailability,
  onMoveUp,
  onMoveDown,
  isUpdating,
}: MenuItemRowProps) {
  return (
    <Card className={!item.is_available ? 'opacity-70' : ''}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sort Controls */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isFirst || isUpdating}
              onClick={onMoveUp}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={isLast || isUpdating}
              onClick={onMoveDown}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="font-medium truncate">{item.name}</h5>
              {!item.is_available && (
                <Badge variant="secondary" className="text-xs">
                  Unavailable
                </Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {item.description}
              </p>
            )}
            <p className="font-semibold mt-1 text-sm sm:text-base">
              {formatNaira(item.price_kobo)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {item.is_available ? 'Available' : 'Hidden'}
              </span>
              <Switch
                checked={item.is_available}
                onCheckedChange={onToggleAvailability}
                disabled={isUpdating}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
