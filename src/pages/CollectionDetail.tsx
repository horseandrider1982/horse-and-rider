import { useParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { LocaleLink } from "@/components/LocaleLink";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useShopifyMenu, type ShopifyMenuItem } from "@/hooks/useShopifyMenu";
import { toast } from "sonner";
import { CollectionJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { usePageMeta } from "@/hooks/usePageMeta";

const SHOPIFY_STOREFRONT_URL = "https://bpjvam-c1.myshopify.com/api/2025-07/graphql.json";
const SHOPIFY_STOREFRONT_TOKEN = "d69c81decdb58ced137c44fa1b033aa3";

const COLLECTION_QUERY = `
  query GetCollection($handle: String!, $first: Int!, $after: String, $language: LanguageCode) @inContext(language: $language) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: $first, after: $after, filters: [{available: true}]) {
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
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  availableForSale
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

async function fetchCollectionPage(handle: string, locale: string, cursor?: string) {
  const res = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({
      query: COLLECTION_QUERY,
      variables: { handle, first: 250, after: cursor || null, language: locale.toUpperCase() },
    }),
  });
  const json = await res.json();
  return json?.data?.collection || null;
}

export default function CollectionDetail() {
  const { handle } = useParams<{ handle: string }>();
  const { t, locale } = useI18n();
  const addItem = useCartStore((s) => s.addItem);

  // Find subcategories from Shopify menu cache
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
      const pageInfo = lastPage?.products?.pageInfo;
      return pageInfo?.hasNextPage ? pageInfo.endCursor : undefined;
    },
    enabled: !!handle,
  });

  // Merge pages: collection meta from first page, products from all pages
  const collection = data?.pages?.[0] || null;
  const allProductEdges = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) => page?.products?.edges || []);
  }, [data]);

  // Shopify filters by availability server-side via `filters: [{available: true}]`
  const products = allProductEdges;

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
            products={products.map((e: any) => ({
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
              {products.length === 0 ? (
                <p className="text-muted-foreground py-8">{t("products.empty")}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(({ node: product }: any) => {
                      const image = product.images?.edges?.[0]?.node;
                      const price = product.priceRange?.minVariantPrice;
                      const variant = product.variants?.edges?.[0]?.node;

                      return (
                        <div
                          key={product.id}
                          className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <LocaleLink to={`/product/${product.handle}`}>
                            <div className="aspect-square bg-white overflow-hidden">
                              {image ? (
                                <img
                                  src={image.url}
                                  alt={image.altText || product.title}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                                  {t("news.no_image")}
                                </div>
                              )}
                            </div>
                          </LocaleLink>
                          <div className="p-3">
                            {product.vendor && (
                              <p className="text-xs text-muted-foreground mb-0.5">{product.vendor}</p>
                            )}
                            <LocaleLink to={`/product/${product.handle}`}>
                              <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                {product.title}
                              </h3>
                            </LocaleLink>
                            {price && (
                              <p className="text-sm font-bold text-foreground mt-1">
                                {new Intl.NumberFormat(locale, {
                                  style: "currency",
                                  currency: price.currencyCode,
                                }).format(parseFloat(price.amount))}
                              </p>
                            )}
                            {variant?.availableForSale && (
                              <button
                                onClick={() => {
                                  addItem({
                                    product: { node: product },
                                    variantId: variant.id,
                                    variantTitle: variant.title || "",
                                    price: { amount: variant.price.amount, currencyCode: variant.price.currencyCode },
                                    quantity: 1,
                                    selectedOptions: variant.selectedOptions || [],
                                  });
                                  toast.success(t("products.added_to_cart"));
                                }}
                                className="mt-2 w-full text-xs py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                              >
                                {t("product.add_to_cart")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {hasNextPage && (
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
                            {t("products.loading") || "Laden..."}
                          </>
                        ) : (
                          t("products.load_more") || "Mehr laden"
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
