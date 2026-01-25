import { useState, useEffect, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useVenues } from '@/hooks/useVenues';
import type { TableWithVenue } from '@/hooks/useTables';

const singleSchema = z.object({
  venue_id: z.string().min(1, 'Please select a venue'),
  label: z.string().min(1, 'Label is required').max(50, 'Label too long'),
});

const bulkNumberSchema = z.object({
  venue_id: z.string().min(1, 'Please select a venue'),
  prefix: z.string().max(20, 'Prefix too long'),
  start: z.coerce.number().int().min(1, 'Start must be at least 1'),
  count: z.coerce.number().int().min(1, 'Count must be at least 1').max(100, 'Max 100 tables'),
});

const bulkListSchema = z.object({
  venue_id: z.string().min(1, 'Please select a venue'),
  labels: z.string().min(1, 'Please enter at least one label'),
});

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSingle: (data: { venue_id: string; label: string }) => Promise<void>;
  onCreateBulk: (data: { venue_id: string; labels: string[] }) => Promise<void>;
  isLoading: boolean;
  existingTables?: TableWithVenue[];
}

// Helper to extract number suffix from a label given a prefix
function extractNumberFromLabel(label: string, prefix: string): number | null {
  if (!label.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  const suffix = label.slice(prefix.length).trim();
  const num = parseInt(suffix, 10);
  return isNaN(num) ? null : num;
}

// Calculate next available start number for a venue and prefix
function getNextAvailableStart(
  existingTables: TableWithVenue[],
  venueId: string,
  prefix: string
): number {
  const venueTables = existingTables.filter((t) => t.venue_id === venueId);
  const numbers = venueTables
    .map((t) => extractNumberFromLabel(t.label, prefix))
    .filter((n): n is number => n !== null);
  
  if (numbers.length === 0) return 1;
  return Math.max(...numbers) + 1;
}

export function CreateTableDialog({
  open,
  onOpenChange,
  onCreateSingle,
  onCreateBulk,
  isLoading,
  existingTables = [],
}: CreateTableDialogProps) {
  const [tab, setTab] = useState<'single' | 'bulk-number' | 'bulk-list'>('single');
  const { data: venues, isLoading: venuesLoading } = useVenues();

  const singleForm = useForm({
    resolver: zodResolver(singleSchema),
    defaultValues: { venue_id: '', label: '' },
  });

  const bulkNumberForm = useForm({
    resolver: zodResolver(bulkNumberSchema),
    defaultValues: { venue_id: '', prefix: 'Table ', start: 1, count: 10 },
  });

  const bulkListForm = useForm({
    resolver: zodResolver(bulkListSchema),
    defaultValues: { venue_id: '', labels: '' },
  });

  // Watch venue and prefix to auto-adjust start number
  const bulkVenueId = bulkNumberForm.watch('venue_id');
  const bulkPrefix = bulkNumberForm.watch('prefix');

  // Calculate suggested start when venue or prefix changes
  useEffect(() => {
    if (bulkVenueId && bulkPrefix) {
      const nextStart = getNextAvailableStart(existingTables, bulkVenueId, bulkPrefix);
      bulkNumberForm.setValue('start', nextStart);
    }
  }, [bulkVenueId, bulkPrefix, existingTables, bulkNumberForm]);

  const handleSingleSubmit = async (values: z.infer<typeof singleSchema>) => {
    await onCreateSingle({ venue_id: values.venue_id, label: values.label });
    singleForm.reset();
    onOpenChange(false);
  };

  const handleBulkNumberSubmit = async (data: z.infer<typeof bulkNumberSchema>) => {
    const labels = Array.from(
      { length: data.count },
      (_, i) => `${data.prefix}${data.start + i}`
    );
    await onCreateBulk({ venue_id: data.venue_id, labels });
    bulkNumberForm.reset();
    onOpenChange(false);
  };

  const handleBulkListSubmit = async (data: z.infer<typeof bulkListSchema>) => {
    const labels = data.labels
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (labels.length === 0) return;
    await onCreateBulk({ venue_id: data.venue_id, labels });
    bulkListForm.reset();
    onOpenChange(false);
  };

  const VenueSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onChange} disabled={venuesLoading}>
      <SelectTrigger>
        <SelectValue placeholder="Select venue" />
      </SelectTrigger>
      <SelectContent>
        {venues?.map((venue) => (
          <SelectItem key={venue.id} value={venue.id}>
            {venue.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Tables</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Single</TabsTrigger>
            <TabsTrigger value="bulk-number">By Number</TabsTrigger>
            <TabsTrigger value="bulk-list">By List</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <form onSubmit={singleForm.handleSubmit(handleSingleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Venue</Label>
                <VenueSelect
                  value={singleForm.watch('venue_id')}
                  onChange={(v) => singleForm.setValue('venue_id', v)}
                />
                {singleForm.formState.errors.venue_id && (
                  <p className="text-sm text-destructive">
                    {singleForm.formState.errors.venue_id.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Table Label</Label>
                <Input
                  {...singleForm.register('label')}
                  placeholder="e.g. Table 5, Bar 2"
                />
                {singleForm.formState.errors.label && (
                  <p className="text-sm text-destructive">
                    {singleForm.formState.errors.label.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Table
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bulk-number" className="space-y-4 mt-4">
            <form onSubmit={bulkNumberForm.handleSubmit(handleBulkNumberSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Venue</Label>
                <VenueSelect
                  value={bulkNumberForm.watch('venue_id')}
                  onChange={(v) => bulkNumberForm.setValue('venue_id', v)}
                />
                {bulkNumberForm.formState.errors.venue_id && (
                  <p className="text-sm text-destructive">
                    {bulkNumberForm.formState.errors.venue_id.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Prefix</Label>
                  <Input {...bulkNumberForm.register('prefix')} placeholder="Table " />
                </div>
                <div className="space-y-2">
                  <Label>Start #</Label>
                  <Input 
                    {...bulkNumberForm.register('start', { valueAsNumber: true })} 
                    type="number" 
                    min={1} 
                  />
                  {bulkNumberForm.formState.errors.start && (
                    <p className="text-sm text-destructive">
                      {bulkNumberForm.formState.errors.start.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Input 
                    {...bulkNumberForm.register('count', { valueAsNumber: true })} 
                    type="number" 
                    min={1} 
                    max={100} 
                  />
                  {bulkNumberForm.formState.errors.count && (
                    <p className="text-sm text-destructive">
                      {bulkNumberForm.formState.errors.count.message}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Will create: {bulkNumberForm.watch('prefix')}
                {Number(bulkNumberForm.watch('start'))} through {bulkNumberForm.watch('prefix')}
                {Number(bulkNumberForm.watch('start')) + Number(bulkNumberForm.watch('count')) - 1}
              </p>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create {bulkNumberForm.watch('count')} Tables
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bulk-list" className="space-y-4 mt-4">
            <form onSubmit={bulkListForm.handleSubmit(handleBulkListSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Venue</Label>
                <VenueSelect
                  value={bulkListForm.watch('venue_id')}
                  onChange={(v) => bulkListForm.setValue('venue_id', v)}
                />
              </div>
              <div className="space-y-2">
                <Label>Table Labels (one per line)</Label>
                <Textarea
                  {...bulkListForm.register('labels')}
                  rows={6}
                  placeholder="Table 1
Table 2
Bar Area
VIP Booth"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Tables
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
