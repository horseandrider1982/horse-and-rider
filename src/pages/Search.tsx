import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { storefrontApiRequest, STOREFRONT_PAGINATED_QUERY, type ShopifyProduct } from "@/lib/shopify";
import { fetchUntilVisible } from "@/lib/fetchVisibleProducts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ListingProductCard } from "@/components/ListingProductCard";
import {
  ListingFilterSidebar,
  MobileFilterToggle,
  useListingFilters,
  EMPTY_LISTING_FILTERS,
  type ListingFilters,
} from "@/components/ListingFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useActivePropertyConfigs } from "@/hooks/usePropertyConfig";


const PAGE_SIZE = 24;

const Search = () => {
  const { t, locale, shopifyLanguage } = useI18n();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_LISTING_FILTERS);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['search-products', query, shopifyLanguage],
    queryFn: async ({ pageParam }) => {
      const queryParts: string[] = [];
      if (query) queryParts.push(query);
      queryParts.push('available_for_sale:true');
      const combinedQuery = queryParts.join(' ');

      return fetchUntilVisible(
        async (cursor?: string) => {
          const res = await storefrontApiRequest(STOREFRONT_PAGINATED_QUERY, {
            first: PAGE_SIZE,
            language: shopifyLanguage,
            after: cursor || pageParam || null,
            query: combinedQuery,
          });
          return {
            edges: (res?.data?.products?.edges || []) as ShopifyProduct[],
            pageInfo: res?.data?.products?.pageInfo || { hasNextPage: false, endCursor: null },
          };
        },
        PAGE_SIZE,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? (lastPage.pageInfo.endCursor ?? undefined) : undefined,
    enabled: !!query,
  });

  // Auto-Nachladen aller Seiten im Hintergrund (max 30), damit Filter-Counts vollständig sind
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      const loadedPages = data?.pages?.length || 0;
      if (loadedPages < 30) fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, data?.pages?.length, fetchNextPage]);

  const allProducts = data?.pages.flatMap(p => p.products) || [];
  const filteredProducts = useListingFilters(allProducts, filters);

  usePageMeta({
    title: query ? `${t("search.search")}: ${query}` : t("search.search"),
    description: query
      ? `${t("search.results_for").replace("{query}", query)} – Horse & Rider`
      : undefined,
    noIndex: true,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <LocaleLink to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("search.back")}
            </LocaleLink>
          </Button>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            {query ? t("search.results_for").replace("{query}", query) : t("search.search")}
          </h1>
          {!isLoading && allProducts.length > 0 && (
            <p className="text-muted-foreground mt-1">
              {allProducts.length === 1 ? t("search.result_one") : t("search.result_other").replace("{count}", String(allProducts.length))}
            </p>
          )}
        </div>

        {/* Mobile filter toggle */}
        {isMobile && allProducts.length > 0 && (
          <div className="mb-4">
            <MobileFilterToggle products={allProducts} filters={filters} onFilterChange={setFilters} />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">{t("search.loading_error")}</div>
        )}

        {!isLoading && !error && allProducts.length === 0 && query && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t("search.no_results").replace("{query}", query)}</p>
          </div>
        )}

        {allProducts.length > 0 && (
          <div className="flex gap-8">
            {/* Desktop filter sidebar */}
            {!isMobile && (
              <div className="w-56 xl:w-64 flex-shrink-0 hidden lg:block">
                <div className="sticky top-4">
                  <ListingFilterSidebar
                    products={allProducts}
                    filters={filters}
                    onFilterChange={setFilters}
                  />
                </div>
              </div>
            )}

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredProducts.map((product) => (
                  <ListingProductCard key={product.node.id} product={product} />
                ))}
              </div>
              {filteredProducts.length === 0 && allProducts.length > 0 && (
                <p className="text-muted-foreground py-8 text-center">{t("search.no_results").replace("{query}", query)}</p>
              )}
              {hasNextPage && filters.vendors.size === 0 && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" size="lg" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("products.loading")}</>
                    ) : (
                      t("products.load_more")
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Search;
