import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Table {
  id: string;
  venue_id: string;
  label: string;
  qr_token: string;
  active: boolean;
  created_at: string;
}

export interface TableWithVenue extends Table {
  venues: {
    id: string;
    name: string;
    venue_slug: string;
  };
}

/**
 * Tenant-scoped tables hook
 * @param tenantId - Required tenant ID for scoping (pass null for super admins viewing globally)
 */
export function useTables(tenantId: string | null | undefined) {
  const queryClient = useQueryClient();

  const tablesQuery = useQuery({
    queryKey: ['tables', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('tables')
        .select('*, venues(id, name, venue_slug)')
        .order('label', { ascending: true });

      // Always scope to tenant when provided
      if (tenantId) {
        query = query.eq('venue_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TableWithVenue[];
    },
    enabled: tenantId !== undefined, // Allow null for super admins
  });

  const createTable = useMutation({
    mutationFn: async (data: { venue_id: string; label: string }) => {
      const { data: table, error } = await supabase
        .from('tables')
        .insert({
          venue_id: data.venue_id,
          label: data.label,
          qr_token: '',
        } as any)
        .select('*, venues(id, name, venue_slug)')
        .single();

      if (error) throw error;
      return table as TableWithVenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create table: ${error.message}`);
    },
  });

  const createBulkTables = useMutation({
    mutationFn: async (data: { venue_id: string; labels: string[] }) => {
      const tables = data.labels.map((label) => ({
        venue_id: data.venue_id,
        label,
        qr_token: '',
      }));

      const { data: createdTables, error } = await supabase
        .from('tables')
        .insert(tables as any)
        .select('*, venues(id, name, venue_slug)');

      if (error) throw error;
      return createdTables as TableWithVenue[];
    },
    onSuccess: (tables) => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`${tables.length} tables created successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to create tables: ${error.message}`);
    },
  });

  const updateTable = useMutation({
    mutationFn: async (data: { id: string; label?: string; active?: boolean }) => {
      const { id, ...updates } = data;
      const { data: table, error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)
        .select('*, venues(id, name, venue_slug)')
        .single();

      if (error) throw error;
      return table as TableWithVenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update table: ${error.message}`);
    },
  });

  const regenerateToken = useMutation({
    mutationFn: async (tableId: string) => {
      const { data: newToken, error: tokenError } = await supabase.rpc('generate_qr_token');
      
      if (tokenError) throw tokenError;

      const { data: table, error } = await supabase
        .from('tables')
        .update({ qr_token: newToken })
        .eq('id', tableId)
        .select('*, venues(id, name, venue_slug)')
        .single();

      if (error) throw error;
      return table as TableWithVenue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR token regenerated - old QR codes are now invalid');
    },
    onError: (error) => {
      toast.error(`Failed to regenerate token: ${error.message}`);
    },
  });

  const deleteTable = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete table: ${error.message}`);
    },
  });

  return {
    tables: tablesQuery.data ?? [],
    isLoading: tablesQuery.isLoading,
    error: tablesQuery.error,
    createTable,
    createBulkTables,
    updateTable,
    regenerateToken,
    deleteTable,
  };
}
