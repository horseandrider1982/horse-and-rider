import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, STOREFRONT_QUERY, PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from '@/lib/shopify';

export function useProducts(first: number = 20) {
  return useQuery({
    queryKey: ['shopify-products', first],
    queryFn: async () => {
      const data = await storefrontApiRequest(STOREFRONT_QUERY, { first });
      return (data?.data?.products?.edges || []) as ShopifyProduct[];
    },
  });
}

export function useProductByHandle(handle: string) {
  return useQuery({
    queryKey: ['shopify-product', handle],
    queryFn: async () => {
      const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
      const product = data?.data?.productByHandle;
      if (!product) return null;
      return { node: product } as ShopifyProduct;
    },
    enabled: !!handle,
  });
}
