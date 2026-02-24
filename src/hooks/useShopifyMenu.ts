import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, SHOPIFY_MENU_QUERY } from '@/lib/shopify';

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
      const data = await storefrontApiRequest(SHOPIFY_MENU_QUERY, { handle });
      const items: ShopifyMenuItem[] = data?.data?.menu?.items || [];
      // Normalize URLs: strip the Shopify domain prefix, keep paths
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
    // If it's a Shopify myshopify.com URL, extract the path
    if (u.hostname.includes('myshopify.com')) {
      return u.pathname + u.search;
    }
    return url;
  } catch {
    return url;
  }
}
