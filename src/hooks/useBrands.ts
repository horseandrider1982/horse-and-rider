import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { storefrontApiRequest, type ShopifyProduct, STOREFRONT_PAGINATED_QUERY } from '@/lib/shopify';
import { fetchUntilVisible } from '@/lib/fetchVisibleProducts';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/i18n';

export interface Brand {
  name: string;
  slug: string;
  logoUrl: string | null;
  seoText: string | null;
  featured: boolean;
  gpsrStreet: string | null;
  gpsrHousenumber: string | null;
  gpsrPostalcode: string | null;
  gpsrCity: string | null;
  gpsrCountry: string | null;
  gpsrEmail: string | null;
  gpsrHomepage: string | null;
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('name, slug, logo_url, seo_text, featured, gpsr_street, gpsr_housenumber, gpsr_postalcode, gpsr_city, gpsr_country, gpsr_email, gpsr_homepage')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return ((data as any[]) || []).map((b): Brand => ({
        name: b.name,
        slug: b.slug,
        logoUrl: b.logo_url,
        seoText: b.seo_text,
        featured: b.featured,
        gpsrStreet: b.gpsr_street,
        gpsrHousenumber: b.gpsr_housenumber,
        gpsrPostalcode: b.gpsr_postalcode,
        gpsrCity: b.gpsr_city,
        gpsrCountry: b.gpsr_country,
        gpsrEmail: b.gpsr_email,
        gpsrHomepage: b.gpsr_homepage,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
}

const BRAND_PAGE_SIZE = 24;

interface BrandProductsPage {
  products: ShopifyProduct[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

async function fetchBrandProductsPage(
  vendor: string,
  locale: string,
  after?: string
): Promise<BrandProductsPage> {
  const languageMap: Record<string, string> = { de: 'DE', en: 'EN', es: 'ES', nl: 'NL', pl: 'PL', da: 'DA', sv: 'SV' };
  const language = languageMap[locale] || 'DE';

  const data = await storefrontApiRequest(STOREFRONT_PAGINATED_QUERY, {
    first: BRAND_PAGE_SIZE,
    query: `vendor:"${vendor}"`,
    after: after || null,
    language,
  });

  const edges = data?.data?.products?.edges || [];
  const pageInfo = data?.data?.products?.pageInfo || { hasNextPage: false, endCursor: null };

  return { products: edges as ShopifyProduct[], pageInfo };
}

export function useBrandProducts(vendor: string, enabled: boolean) {
  const { locale } = useI18n();

  return useInfiniteQuery({
    queryKey: ['brand-products', vendor, locale],
    queryFn: ({ pageParam }) => fetchBrandProductsPage(vendor, locale, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? (lastPage.pageInfo.endCursor ?? undefined) : undefined,
    enabled,
  });
}
