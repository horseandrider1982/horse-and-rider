import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeaturedBrand {
  name: string;
  slug: string;
  logoUrl: string | null;
}

/**
 * Lightweight hook that only fetches featured brands from the CMS table.
 * Unlike useBrands, this does NOT paginate through all Shopify products.
 */
export function useFeaturedBrands() {
  return useQuery({
    queryKey: ['featured-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands' as any)
        .select('name, slug, logo_url')
        .eq('featured', true)
        .eq('is_active', true);
      if (error) throw error;
      return ((data as any[]) || [])
        .filter((b: any) => b.logo_url)
        .map((b: any): FeaturedBrand => ({
          name: b.name,
          slug: b.slug,
          logoUrl: b.logo_url,
        }));
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}
