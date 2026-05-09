import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { storefrontApiRequest, PRODUCT_BY_HANDLE_QUERY, type ShopifyProduct } from '@/lib/shopify';
import { useI18n } from '@/i18n';
import { useActivePropertyConfigs } from '@/hooks/usePropertyConfig';

/**
 * Returns a callback that prefetches a product into the TanStack Query cache.
 * Usage: <Link onMouseEnter={() => prefetch(handle)} onFocus={() => prefetch(handle)}>
 *
 * Uses the SAME cache key as `useProductByHandle` so the PDP renders instantly.
 * Per-card hover is debounced via a Set so we never fire the same query twice.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();
  const { shopifyLanguage } = useI18n();
  const { data: configs } = useActivePropertyConfigs();
  const inflight = useRef<Set<string>>(new Set());

  const xentralIds = (configs ?? []).map(c => ({
    namespace: c.shopify_namespace,
    key: c.shopify_key,
  }));
  const idsSig = xentralIds.map(i => `${i.namespace}.${i.key}`).sort().join(',');

  return useCallback((handle: string) => {
    if (!handle) return;
    const key = `${handle}|${shopifyLanguage}|${idsSig}`;
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    queryClient.prefetchQuery({
      queryKey: ['shopify-product', handle, shopifyLanguage, idsSig],
      queryFn: async () => {
        const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, {
          handle,
          language: shopifyLanguage,
          xentralIds,
        });
        const product = data?.data?.productByHandle;
        if (!product) return null;
        return { node: product } as ShopifyProduct;
      },
      staleTime: 60_000,
    });
  }, [queryClient, shopifyLanguage, idsSig]);
}
