import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

export interface ShopifyMenuItem {
  id: string;
  title: string;
  url: string;
  handle?: string;
  items?: ShopifyMenuItem[];
}

// Handles to exclude from navigation (not real categories)
const EXCLUDED_HANDLES = ['frontpage'];

export function useShopifyMenu(handle: string = 'main-menu') {
  const { locale } = useI18n();

  return useQuery({
    queryKey: ['shopify-menu', handle, locale],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-menu', {
        body: { handle, language: locale },
      });
      if (error) throw error;
      const items: ShopifyMenuItem[] = data?.items || [];
      return items
        .filter(item => !EXCLUDED_HANDLES.includes(item.handle || ''))
        .map(normalizeItem);
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
