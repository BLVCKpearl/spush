import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRequireAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import { useCategories, useAllMenuItems } from '@/hooks/useMenu';
import { supabase } from '@/integrations/supabase/client';
import { formatNaira, nairaToKobo, koboToNaira } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Category, MenuItem } from '@/types/database';

export default function AdminMenuPage() {
  // Admin-only page
  const { loading: authLoading } = useRequireAuth('admin');
  
  const queryClient = useQueryClient();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: menuItems, isLoading: menuLoading } = useAllMenuItems();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Category mutations
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = categories?.reduce((max, c) => Math.max(max, c.display_order), 0) || 0;
      const { error } = await supabase
        .from('categories')
        .insert({ name, display_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
      setCategoryDialogOpen(false);
    },
    onError: () => toast.error('Failed to create category'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      toast.success('Category updated');
      setCategoryDialogOpen(false);
      setEditingCategory(null);
    },
    onError: () => toast.error('Failed to update category'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      toast.success('Category deleted');
    },
    onError: () => toast.error('Failed to delete category (may have items)'),
  });

  // Menu item mutations
  const createMenuItem = useMutation({
    mutationFn: async (data: {
      category_id: string;
      name: string;
      description: string;
      price_kobo: number;
    }) => {
      const { error } = await supabase.from('menu_items').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu item created');
      setItemDialogOpen(false);
    },
    onError: () => toast.error('Failed to create menu item'),
  });

  const updateMenuItem = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      category_id?: string;
      name?: string;
      description?: string;
      price_kobo?: number;
      is_available?: boolean;
    }) => {
      const { error } = await supabase.from('menu_items').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu item updated');
      setItemDialogOpen(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Failed to update menu item'),
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
      toast.success('Menu item deleted');
    },
    onError: () => toast.error('Failed to delete menu item'),
  });

  const toggleAvailability = async (item: MenuItem) => {
    await updateMenuItem.mutateAsync({
      id: item.id,
      is_available: !item.is_available,
    });
  };

  if (categoriesLoading || menuLoading) {
    return (
      <AdminLayout title="Menu Management">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const groupedItems = menuItems?.reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = [];
    acc[item.category_id].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <AdminLayout title="Menu Management">
      <div className="space-y-6">
        {/* Categories Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Categories</h3>
            <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
              setCategoryDialogOpen(open);
              if (!open) setEditingCategory(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CategoryForm
                  category={editingCategory}
                  onSubmit={(name) => {
                    if (editingCategory) {
                      updateCategory.mutate({ id: editingCategory.id, name });
                    } else {
                      createCategory.mutate(name);
                    }
                  }}
                  isLoading={createCategory.isPending || updateCategory.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories?.map((category) => (
              <Badge
                key={category.id}
                variant="secondary"
                className="text-sm py-1.5 px-3 cursor-pointer"
                onClick={() => {
                  setEditingCategory(category);
                  setCategoryDialogOpen(true);
                }}
              >
                {category.name}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-2 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this category? All items in it will be deleted too.')) {
                      deleteCategory.mutate(category.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {!categories?.length && (
              <p className="text-sm text-muted-foreground">No categories yet</p>
            )}
          </div>
        </section>

        {/* Menu Items Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Menu Items</h3>
            <Dialog open={itemDialogOpen} onOpenChange={(open) => {
              setItemDialogOpen(open);
              if (!open) setEditingItem(null);
            }}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!categories?.length}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <MenuItemForm
                  item={editingItem}
                  categories={categories || []}
                  onSubmit={(data) => {
                    if (editingItem) {
                      updateMenuItem.mutate({ id: editingItem.id, ...data });
                    } else {
                      createMenuItem.mutate(data as any);
                    }
                  }}
                  isLoading={createMenuItem.isPending || updateMenuItem.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {categories?.map((category) => (
            <div key={category.id} className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {category.name}
              </h4>
              <div className="space-y-2">
                {groupedItems?.[category.id]?.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">{item.name}</h5>
                            {!item.is_available && (
                              <Badge variant="secondary">Unavailable</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                          <p className="font-semibold mt-2">
                            {formatNaira(item.price_kobo)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => toggleAvailability(item)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingItem(item);
                              setItemDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Delete this item?')) {
                                deleteMenuItem.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )) || (
                  <p className="text-sm text-muted-foreground py-4">
                    No items in this category
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}

// Category Form Component
function CategoryForm({
  category,
  onSubmit,
  isLoading,
}: {
  category: Category | null;
  onSubmit: (name: string) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(category?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="categoryName">Category Name</Label>
          <Input
            id="categoryName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Dishes"
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
}

// Menu Item Form Component
function MenuItemForm({
  item,
  categories,
  onSubmit,
  isLoading,
}: {
  item: MenuItem | null;
  categories: Category[];
  onSubmit: (data: {
    category_id: string;
    name: string;
    description: string;
    price_kobo: number;
  }) => void;
  isLoading: boolean;
}) {
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '');
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [priceNaira, setPriceNaira] = useState(
    item ? koboToNaira(item.price_kobo).toString() : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(priceNaira);
    if (name.trim() && categoryId && !isNaN(price) && price >= 0) {
      onSubmit({
        category_id: categoryId,
        name: name.trim(),
        description: description.trim(),
        price_kobo: nairaToKobo(price),
      });
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="itemCategory">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemName">Name</Label>
          <Input
            id="itemName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jollof Rice"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemDescription">Description</Label>
          <Textarea
            id="itemDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="itemPrice">Price (₦)</Label>
          <Input
            id="itemPrice"
            type="number"
            min="0"
            step="0.01"
            value={priceNaira}
            onChange={(e) => setPriceNaira(e.target.value)}
            placeholder="e.g., 2500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button 
            type="submit" 
            disabled={isLoading || !name.trim() || !categoryId || !priceNaira}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </form>
    </>
  );
}
