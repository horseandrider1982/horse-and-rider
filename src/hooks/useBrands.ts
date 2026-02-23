import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, type ShopifyProduct, STOREFRONT_QUERY } from '@/lib/shopify';
import { supabase } from '@/integrations/supabase/client';

const ALL_VENDORS_QUERY = `
  query GetAllVendors($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          vendor
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface Brand {
  name: string;
  slug: string;
  logoUrl: string | null;
  seoText: string | null;
  featured: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchAllVendors(): Promise<string[]> {
  const vendors = new Set<string>();
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const vars: Record<string, unknown> = { first: 250 };
    if (after) vars.after = after;
    const data = await storefrontApiRequest(ALL_VENDORS_QUERY, vars);
    const edges = data?.data?.products?.edges || [];
    for (const edge of edges) {
      if (edge.node.vendor) vendors.add(edge.node.vendor);
    }
    hasNextPage = data?.data?.products?.pageInfo?.hasNextPage || false;
    after = data?.data?.products?.pageInfo?.endCursor || null;
  }

  return Array.from(vendors).sort((a, b) => a.localeCompare(b, 'de'));
}

async function fetchCmsBrands(): Promise<Array<{
  name: string;
  slug: string;
  logo_url: string | null;
  seo_text: string | null;
  featured: boolean;
}>> {
  const { data } = await supabase.from('brands' as any).select('*');
  return (data as any[]) || [];
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const [vendors, cmsBrands] = await Promise.all([fetchAllVendors(), fetchCmsBrands()]);
      const cmsMap = new Map(cmsBrands.map((b) => [b.name.toLowerCase().trim(), b]));

      const brands: Brand[] = vendors.map((vendor) => {
        const cms = cmsMap.get(vendor.toLowerCase().trim());
        return {
          name: cms?.name || vendor,
          slug: cms?.slug || slugify(vendor),
          logoUrl: cms?.logo_url || null,
          seoText: cms?.seo_text || null,
          featured: cms?.featured || false,
        };
      });

      return brands;
    },
  });
}

export function useBrandProducts(vendor: string, enabled: boolean) {
  return useQuery({
    queryKey: ['brand-products', vendor],
    queryFn: async () => {
      const data = await storefrontApiRequest(STOREFRONT_QUERY, {
        first: 24,
        query: `vendor:"${vendor}"`,
      });
      return (data?.data?.products?.edges || []) as ShopifyProduct[];
    },
    enabled,
  });
}
