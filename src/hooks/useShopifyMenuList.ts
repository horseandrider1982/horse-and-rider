import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyMenuInfo {
  handle: string;
  title: string;
}

export function useShopifyMenuList() {
  return useQuery({
    queryKey: ['shopify-menu-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'shopify_menus')
        .single();
      if (error) throw error;
      try {
        return JSON.parse(data.value) as ShopifyMenuInfo[];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}
