import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, type ShopifyProduct, STOREFRONT_QUERY } from '@/lib/shopify';
import { supabase } from '@/integrations/supabase/client';

export interface Brand {
  name: string;
  slug: string;
  logoUrl: string | null;
  seoText: string | null;
  featured: boolean;
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('name, slug, logo_url, seo_text, featured')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return ((data as any[]) || []).map((b): Brand => ({
        name: b.name,
        slug: b.slug,
        logoUrl: b.logo_url,
        seoText: b.seo_text,
        featured: b.featured,
      }));
    },
    staleTime: 1000 * 60 * 5,
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
