import { useParams } from "react-router-dom";
import { BackToTop } from "@/components/BackToTop";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { LocaleLink } from "@/components/LocaleLink";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useShopifyMenu, type ShopifyMenuItem } from "@/hooks/useShopifyMenu";
import { CollectionJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { CollectionSeoText } from "@/components/CollectionSeoText";
import { usePageMeta } from "@/hooks/usePageMeta";
import { isProductVisibleInListing, type ShopifyProduct } from "@/lib/shopify";
import { fetchUntilVisible, type VisibleProductsPage } from "@/lib/fetchVisibleProducts";
import { ListingProductCard } from "@/components/ListingProductCard";
import {
  ListingFilterSidebar,
  MobileFilterToggle,
  useListingFilters,
  EMPTY_LISTING_FILTERS,
  type ListingFilters,
} from "@/components/ListingFilterSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const SHOPIFY_STOREFRONT_URL = "https://bpjvam-c1.myshopify.com/api/2025-07/graphql.json";
const SHOPIFY_STOREFRONT_TOKEN = "d69c81decdb58ced137c44fa1b033aa3";

const COLLECTION_QUERY = `
  query GetCollection($handle: String!, $first: Int!, $after: String, $language: LanguageCode) @inContext(language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            title
            handle
            vendor
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            metafields(identifiers: [
              {namespace: "custom", key: "lieferantenbestand"},
              {namespace: "custom", key: "ueberverkauf"}
            ]) {
              namespace
              key
              value
              type
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
                  metafields(identifiers: [
                    {namespace: "custom", key: "lieferantenbestand"},
                    {namespace: "custom", key: "ueberverkauf"}
                  ]) {
                    namespace
                    key
                    value
                    type
                  }
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchCollectionPage(handle: string, locale: string, cursor?: string): Promise<VisibleProductsPage & { collection: any }> {
  const fetcher = async (innerCursor?: string) => {
    const res = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: COLLECTION_QUERY,
        variables: { handle, first: 24, after: innerCursor || cursor || null, language: locale.toUpperCase() },
      }),
    });
    const json = await res.json();
    const collection = json?.data?.collection;
    if (!collection) return { edges: [] as ShopifyProduct[], pageInfo: { hasNextPage: false, endCursor: null }, _collection: null };
    const edges = (collection.products?.edges || []).map((e: any) => ({ node: e.node })) as ShopifyProduct[];
    const pageInfo = collection.products?.pageInfo || { hasNextPage: false, endCursor: null };
    return { edges, pageInfo, _collection: collection };
  };

  let collectionMeta: any = null;
  const result = await fetchUntilVisible(
    async (c?: string) => {
      const r = await fetcher(c);
      if (!collectionMeta && r._collection) collectionMeta = r._collection;
      return { edges: r.edges, pageInfo: r.pageInfo };
    },
    24,
  );

  return { ...result, collection: collectionMeta };
}

export default function CollectionDetail() {
  const { handle } = useParams<{ handle: string }>();
  const { t, locale } = useI18n();
  const isMobile = useIsMobile();
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_LISTING_FILTERS);

  const { data: menuItems } = useShopifyMenu('kategoriemenu');
  const { data: mainMenuItems } = useShopifyMenu('main-menu');

  const subcategories = useMemo(() => {
    if (!handle) return [];
    const findChildren = (items: ShopifyMenuItem[]): ShopifyMenuItem[] => {
      for (const item of items) {
        if (item.handle === handle && item.items?.length) return item.items;
        if (item.items?.length) {
          const found = findChildren(item.items);
          if (found.length) return found;
        }
      }
      return [];
    };
    const fromKat = findChildren(menuItems || []);
    if (fromKat.length) return fromKat;
    return findChildren(mainMenuItems || []);
  }, [handle, menuItems, mainMenuItems]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["collection", handle, locale],
    queryFn: async ({ pageParam }) => {
      return fetchCollectionPage(handle!, locale, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      return lastPage?.pageInfo?.hasNextPage ? (lastPage.pageInfo.endCursor ?? undefined) : undefined;
    },
    enabled: !!handle,
  });

  const collection = data?.pages?.[0]?.collection || null;
  const allProducts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page.products || []);
  }, [data]);

  const filteredProducts = useListingFilters(allProducts, filters);

  const collectionMetaDesc = collection
    ? collection.description?.slice(0, 120)
      ? `${collection.title} – ${collection.description.replace(/\s+/g, ' ').trim().slice(0, 120)}. Jetzt bei Horse & Rider kaufen.`.slice(0, 160)
      : `${collection.title} – Kollektion bei Horse & Rider Luhmühlen. Über 20.000 Reitsport-Produkte online bestellen.`
    : undefined;

  usePageMeta({
    title: collection?.title,
    description: collectionMetaDesc,
    canonicalPath: handle ? `/${locale}/collections/${handle}` : undefined,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {collection && (
        <>
          <CollectionJsonLd
            name={collection.title}
            description={collection.description}
            handle={handle || ""}
            products={allProducts.map((e: any) => ({
              name: e.node.title,
              handle: e.node.handle,
              image: e.node.images?.edges?.[0]?.node?.url,
              price: e.node.priceRange?.minVariantPrice?.amount || "0",
              currency: e.node.priceRange?.minVariantPrice?.currencyCode || "EUR",
            }))}
            locale={locale}
          />
          <BreadcrumbJsonLd items={[
            { name: "Home", url: `https://horse-and-rider.de/${locale}` },
            { name: collection.title, url: `https://horse-and-rider.de/${locale}/collections/${handle}` },
          ]} />
        </>
      )}
      <TopBar />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div>
              <Skeleton className="h-10 w-64 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
                ))}
              </div>
            </div>
          ) : error || !collection ? (
            <div className="text-center py-16">
              <h1 className="text-2xl font-bold mb-2">{t("notfound.message")}</h1>
              <LocaleLink to="/" className="text-primary hover:underline">
                {t("notfound.back")}
              </LocaleLink>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                {collection.title}
              </h1>
              {collection.description && (
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {collection.description}
                </p>
              )}
              {subcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {subcategories.map((sub) => (
                    <LocaleLink
                      key={sub.id}
                      to={sub.url}
                      className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      {sub.title}
                    </LocaleLink>
                  ))}
                </div>
              )}

              {/* Mobile filter toggle */}
              {isMobile && allProducts.length > 0 && (
                <div className="mb-4">
                  <MobileFilterToggle products={allProducts} filters={filters} onFilterChange={setFilters} />
                </div>
              )}

              {allProducts.length === 0 ? (
                <p className="text-muted-foreground py-8">{t("products.empty")}</p>
              ) : (
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
                      <p className="text-muted-foreground py-8 text-center">{t("search.no_results").replace("{query}", "")}</p>
                    )}
                    {hasNextPage && filters.vendors.size === 0 && (
                      <div className="flex justify-center mt-8">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                        >
                          {isFetchingNextPage ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              {t("products.loading")}
                            </>
                          ) : (
                            t("products.load_more")
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <CollectionSeoText handle={handle} locale={locale} />
            </>
          )}
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
