import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify";
import { useI18n } from "@/i18n";

const PRODUCT_PROPS_QUERY = `
  query GetProductProps($handle: String!, $identifiers: [HasMetafieldsIdentifier!]!, $language: LanguageCode) @inContext(language: $language) {
    productByHandle(handle: $handle) {
      id
      metafields(identifiers: $identifiers) {
        namespace
        key
        value
        type
      }
      variants(first: 100) {
        edges {
          node {
            id
            metafields(identifiers: $identifiers) {
              namespace
              key
              value
              type
            }
          }
        }
      }
    }
  }
`;

interface MetafieldNode {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

export interface ProductPropsResult {
  product: Record<string, string>; // key -> value
  variants: Record<string, Record<string, string>>; // variantId -> key -> value
}

/**
 * Loads product + variant metafield values for a given namespace+key list.
 * Result is keyed only by `key` (assumes one namespace per fetch, e.g. xentral_props).
 */
export function useProductProperties(
  handle: string | undefined,
  identifiers: Array<{ namespace: string; key: string }>,
) {
  const { shopifyLanguage } = useI18n();
  const keysSig = identifiers
    .map((i) => `${i.namespace}.${i.key}`)
    .sort()
    .join(",");

  return useQuery({
    queryKey: ["product-properties", handle, keysSig, shopifyLanguage],
    enabled: !!handle && identifiers.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ProductPropsResult> => {
      const data = await storefrontApiRequest(PRODUCT_PROPS_QUERY, {
        handle,
        identifiers,
        language: shopifyLanguage,
      });
      const node = data?.data?.productByHandle;
      const result: ProductPropsResult = { product: {}, variants: {} };
      if (!node) return result;

      const productMfs: (MetafieldNode | null)[] = node.metafields ?? [];
      for (const mf of productMfs) {
        if (mf && mf.value) result.product[mf.key] = mf.value;
      }
      const variantEdges: Array<{
        node: { id: string; metafields: (MetafieldNode | null)[] };
      }> = node.variants?.edges ?? [];
      for (const { node: v } of variantEdges) {
        const map: Record<string, string> = {};
        for (const mf of v.metafields ?? []) {
          if (mf && mf.value) map[mf.key] = mf.value;
        }
        result.variants[v.id] = map;
      }
      return result;
    },
  });
}
