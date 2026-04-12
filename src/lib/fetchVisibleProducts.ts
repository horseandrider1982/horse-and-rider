import { isProductVisibleInListing, type ShopifyProduct } from './shopify';

const MAX_ITERATIONS = 5; // initial iteration limit
const MIN_VISIBLE = 12; // minimum visible products before stopping
const EXTENDED_MAX_ITERATIONS = 15; // extended limit when below MIN_VISIBLE

export interface VisibleProductsPage {
  products: ShopifyProduct[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

/**
 * Fetches Shopify pages until `target` visible products are accumulated.
 * Returns a combined page with the collected visible products and the
 * cursor/hasNextPage from the last underlying Shopify page fetched.
 */
export async function fetchUntilVisible(
  fetcher: (cursor?: string) => Promise<{ edges: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }>,
  target: number = 24,
): Promise<VisibleProductsPage> {
  const visible: ShopifyProduct[] = [];
  let cursor: string | undefined;
  let hasMore = true;
  let iterations = 0;

  while (visible.length < target && hasMore && iterations < MAX_ITERATIONS) {
    iterations++;
    const result = await fetcher(cursor);
    const edges = result.edges || [];
    
    for (const product of edges) {
      if (isProductVisibleInListing(product.node)) {
        visible.push(product);
      }
    }

    hasMore = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor ?? undefined;
  }

  return {
    products: visible,
    pageInfo: { hasNextPage: hasMore, endCursor: cursor ?? null },
  };
}
