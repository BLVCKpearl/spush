import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TableSession {
  tenantId: string;  // Same as venueId - for multi-tenant consistency
  venueId: string;
  tableId: string;
  tableLabel: string;
  venueName: string;
  venueSlug: string;
}

const SESSION_KEY = 'table_session';

export function getStoredSession(): TableSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid stored data
  }
  return null;
}

export function clearStoredSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function useTableSession() {
  const [session, setSession] = useState<TableSession | null>(() => getStoredSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeSession = useCallback((newSession: TableSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const clearSession = useCallback(() => {
    clearStoredSession();
    setSession(null);
  }, []);

  const resolveTable = useCallback(async (venueSlug: string, qrToken: string): Promise<TableSession | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // First, find the venue by slug
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, name, venue_slug')
        .eq('venue_slug', venueSlug)
        .maybeSingle();

      if (venueError) {
        setError('Failed to load venue information');
        return null;
      }

      if (!venue) {
        setError('Venue not found');
        return null;
      }

      // Use secure RPC function to resolve QR token (doesn't expose other tokens)
      const { data: tableData, error: tableError } = await supabase
        .rpc('resolve_qr_token', { p_qr_token: qrToken });

      if (tableError) {
        setError('Failed to load table information');
        return null;
      }

      // RPC returns an array, get first result
      const table = tableData?.[0];

      if (!table) {
        setError('Invalid QR code. Table not found.');
        return null;
      }

      // Verify the table belongs to this venue
      if (table.venue_id !== venue.id) {
        setError('Invalid QR code for this venue.');
        return null;
      }

      if (!table.active) {
        setError('This table is currently inactive. Please ask staff for assistance.');
        return null;
      }

      const newSession: TableSession = {
        tenantId: venue.id,  // tenantId === venueId for consistency
        venueId: venue.id,
        tableId: table.id,
        tableLabel: table.label,
        venueName: venue.name,
        venueSlug: venue.venue_slug,
      };

      storeSession(newSession);
      return newSession;
    } catch (err) {
      setError('An unexpected error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storeSession]);

  return {
    session,
    isLoading,
    error,
    resolveTable,
    clearSession,
    storeSession,
  };
}
