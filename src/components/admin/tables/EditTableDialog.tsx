import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const editSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
  active: z.boolean(),
});

interface EditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: {
    id: string;
    label: string;
    active: boolean;
  } | null;
  onSave: (data: { id: string; label: string; active: boolean }) => Promise<void>;
  isLoading: boolean;
}

export function EditTableDialog({
  open,
  onOpenChange,
  table,
  onSave,
  isLoading,
}: EditTableDialogProps) {
  const form = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      label: '',
      active: true,
    },
  });

  // Reset form when table changes or dialog opens
  useEffect(() => {
    if (table && open) {
      form.reset({
        label: table.label,
        active: table.active,
      });
    }
  }, [table, open, form]);

  const handleSubmit = async (data: z.infer<typeof editSchema>) => {
    if (!table) return;
    await onSave({ id: table.id, label: data.label, active: data.active });
    onOpenChange(false);
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Table</DialogTitle>
          <DialogDescription>
            Update the table label or toggle its active status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Table Label</Label>
            <Input {...form.register('label')} placeholder="e.g. Table 5" />
            {form.formState.errors.label && (
              <p className="text-sm text-destructive">
                {form.formState.errors.label.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive tables will reject guest scans
              </p>
            </div>
            <Switch
              checked={form.watch('active')}
              onCheckedChange={(checked) => form.setValue('active', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
