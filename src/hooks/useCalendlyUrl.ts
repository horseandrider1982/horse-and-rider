import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCalendlyUrl() {
  return useQuery({
    queryKey: ['site-settings', 'calendly_url'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings' as any)
        .select('value')
        .eq('key', 'calendly_url')
        .single();
      return (data as any)?.value as string || '';
    },
  });
}

export function useUpdateCalendlyUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from('site_settings' as any)
        .update({ value: url, updated_at: new Date().toISOString() } as any)
        .eq('key', 'calendly_url');
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings', 'calendly_url'] }),
  });
}
