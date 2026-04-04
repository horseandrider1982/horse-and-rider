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

const PAGE_SIZE = 24;

const SearchProductCard = ({ product }: { product: ShopifyProduct }) => {
  const { locale } = useI18n();
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <LocaleLink
      to={`/product/${product.node.handle}`}
      className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block"
    >
      <div className="aspect-square overflow-hidden bg-white">
        {image ? (
          <img src={image.url} alt={image.altText || product.node.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">🛍️</div>
        )}
      </div>
      <div className="p-4">
        {product.node.vendor && <p className="text-xs text-muted-foreground mb-0.5 truncate uppercase tracking-wider">{product.node.vendor}</p>}
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.node.title}</h3>
        <span className="font-bold text-primary">
          {new Intl.NumberFormat(locale, { style: "currency", currency: price.currencyCode }).format(parseFloat(price.amount))}
        </span>
      </div>
    </LocaleLink>
  );
};

const Search = () => {
  const { t, locale, shopifyLanguage } = useI18n();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

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

  const products = data?.pages.flatMap(p => p.products) || [];

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
          {!isLoading && products.length > 0 && (
            <p className="text-muted-foreground mt-1">
              {products.length === 1 ? t("search.result_one") : t("search.result_other").replace("{count}", String(products.length))}
            </p>
          )}
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">{t("search.loading_error")}</div>
        )}

        {!isLoading && !error && products.length === 0 && query && (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">{t("search.no_results").replace("{query}", query)}</p>
          </div>
        )}

        {products.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <SearchProductCard key={product.node.id} product={product} />
              ))}
            </div>
            {hasNextPage && (
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
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Search;
