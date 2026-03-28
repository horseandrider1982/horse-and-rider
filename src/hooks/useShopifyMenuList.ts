import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyMenuInfo {
  id: string;
  handle: string;
  title: string;
  itemsCount: number;
}

export function useShopifyMenuList() {
  return useQuery({
    queryKey: ['shopify-menu-list'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-menu', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return (data?.menus || []) as ShopifyMenuInfo[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
