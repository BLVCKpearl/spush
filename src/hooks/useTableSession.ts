import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TableSession {
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

      // Then, find the table by qr_token and venue_id
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('id, label, active, venue_id')
        .eq('qr_token', qrToken)
        .eq('venue_id', venue.id)
        .maybeSingle();

      if (tableError) {
        setError('Failed to load table information');
        return null;
      }

      if (!table) {
        setError('Invalid QR code. Table not found.');
        return null;
      }

      if (!table.active) {
        setError('This table is currently inactive. Please ask staff for assistance.');
        return null;
      }

      const newSession: TableSession = {
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
