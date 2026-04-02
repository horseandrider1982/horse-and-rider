import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, STOREFRONT_QUERY, PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from '@/lib/shopify';
import { useI18n } from '@/i18n';

export function useProducts(first: number = 20, query?: string) {
  const { shopifyLanguage } = useI18n();

  return useQuery({
    queryKey: ['shopify-products', first, query, shopifyLanguage],
    queryFn: async () => {
      const variables: Record<string, unknown> = { first, language: shopifyLanguage };
      // Combine user query with availability filter
      const parts: string[] = [];
      if (query) parts.push(query);
      parts.push('available_for_sale:true');
      variables.query = parts.join(' ');
      const data = await storefrontApiRequest(STOREFRONT_QUERY, variables);
      return (data?.data?.products?.edges || []) as ShopifyProduct[];
    },
  });
}

export function useProductByHandle(handle: string) {
  const { shopifyLanguage } = useI18n();

  return useQuery({
    queryKey: ['shopify-product', handle, shopifyLanguage],
    queryFn: async () => {
      const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle, language: shopifyLanguage });
      const product = data?.data?.productByHandle;
      if (!product) return null;
      return { node: product } as ShopifyProduct;
    },
    enabled: !!handle,
  });
}
