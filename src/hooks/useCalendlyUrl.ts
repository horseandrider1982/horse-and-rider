import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBookingUrl() {
  return useQuery({
    queryKey: ['site-settings', 'booking_url'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'booking_url')
        .single();
      return (data as any)?.value as string || '';
    },
  });
}

export function useUpdateBookingUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value: url, updated_at: new Date().toISOString() } as any)
        .eq('key', 'booking_url');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings', 'booking_url'] }),
  });
}

/** @deprecated Use useBookingUrl instead */
export const useCalendlyUrl = useBookingUrl;
/** @deprecated Use useUpdateBookingUrl instead */
export const useUpdateCalendlyUrl = useUpdateBookingUrl;
