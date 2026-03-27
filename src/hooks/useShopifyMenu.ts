import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyMenuItem {
  id: string;
  title: string;
  url: string;
  items?: ShopifyMenuItem[];
}

export function useShopifyMenu(handle: string = 'main-menu') {
  return useQuery({
    queryKey: ['shopify-menu', handle],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-menu', {
        body: { handle },
      });
      if (error) throw error;
      const items: ShopifyMenuItem[] = data?.items || [];
      return items.map(normalizeItem);
    },
    staleTime: 1000 * 60 * 10,
  });
}

function normalizeItem(item: ShopifyMenuItem): ShopifyMenuItem {
  return {
    ...item,
    url: normalizeShopifyUrl(item.url),
    items: item.items?.map(normalizeItem),
  };
}

function normalizeShopifyUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('myshopify.com')) {
      return u.pathname + u.search;
    }
    return url;
  } catch {
    return url;
  }
}
