import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VenueSetting {
  id: string;
  venue_id: string | null;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

export function useVenueSetting(venueId: string | undefined, settingKey: string) {
  return useQuery({
    queryKey: ['venue-settings', venueId, settingKey],
    queryFn: async () => {
      if (!venueId) return null;
      
      const { data, error } = await supabase
        .from('venue_settings')
        .select('*')
        .eq('venue_id', venueId)
        .eq('setting_key', settingKey)
        .maybeSingle();
      
      if (error) throw error;
      return data as VenueSetting | null;
    },
    enabled: !!venueId,
  });
}

export function useUpdateVenueSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      venueId,
      settingKey,
      settingValue,
    }: {
      venueId: string;
      settingKey: string;
      settingValue: string;
    }) => {
      const { data, error } = await supabase
        .from('venue_settings')
        .upsert(
          {
            venue_id: venueId,
            setting_key: settingKey,
            setting_value: settingValue,
          },
          {
            onConflict: 'venue_id,setting_key',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as VenueSetting;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['venue-settings', data.venue_id, data.setting_key] 
      });
    },
  });
}

export function useOrderExpiryMinutes(venueId: string | undefined) {
  const { data, ...rest } = useVenueSetting(venueId, 'order_expiry_minutes');
  
  return {
    ...rest,
    data: data ? parseInt(data.setting_value, 10) : 15, // Default to 15 minutes
  };
}
