import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "./LocaleLink";
import { useCartStore } from "@/stores/cartStore";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/ga4";
import { isProductVisibleInListing } from "@/lib/shopify";

const SIMILAR_QUERY = `
  query GetSimilar($first: Int!, $query: String, $language: LanguageCode) @inContext(language: $language) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          handle
          vendor
          priceRange {
            minVariantPrice { amount currencyCode }
          }
          images(first: 1) {
            edges { node { url altText } }
          }
          variants(first: 1) {
            edges {
              node {
                id title
                price { amount currencyCode }
                availableForSale
                currentlyNotInStock
                metafields(identifiers: [
                  {namespace: "custom", key: "lieferantenbestand"},
                  {namespace: "custom", key: "ueberverkauf"}
                ]) {
                  namespace
                  key
                  value
                  type
                }
                selectedOptions { name value }
              }
            }
          }
          options { name values }
        }
      }
    }
  }
`;

function useSimilarProducts(vendor: string | undefined, productType: string | undefined, currentId: string | undefined, language: string) {
  return useQuery({
    queryKey: ["similar-products", vendor, productType, currentId, language],
    queryFn: async () => {
      // Try vendor-based first, then productType-based
      const queries: string[] = [];
      if (vendor) queries.push(`vendor:"${vendor}"`);
      if (productType) queries.push(`product_type:"${productType}"`);
      if (!queries.length) return [];

      const queryStr = queries[0]; // primary: same vendor
      const data = await storefrontApiRequest(SIMILAR_QUERY, {
        first: 9,
        query: queryStr,
        language,
      });
      const edges = (data?.data?.products?.edges || []) as ShopifyProduct[];
      // Filter out current product and non-visible products
      return edges
        .filter(p => p.node.id !== currentId && isProductVisibleInListing(p.node))
        .slice(0, 4);
    },
    enabled: !!(vendor || productType) && !!currentId,
    staleTime: 5 * 60 * 1000,
  });
}

function SimilarProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore(s => s.addItem);
  const isLoading = useCartStore(s => s.isLoading);
  const { t } = useI18n();
  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!variant) return;
    await addItem({
      product, variantId: variant.id, variantTitle: variant.title,
      price: variant.price, quantity: 1, selectedOptions: variant.selectedOptions || [],
    });
    trackAddToCart(product, variant.id, 1);
    toast.success(t("products.added_to_cart"), { description: product.node.title, position: "top-center" });
  };

  return (
    <LocaleLink to={`/product/${product.node.handle}`} className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
      <div className="aspect-square overflow-hidden bg-white">
        {image ? (
          <img src={image.url} alt={image.altText || product.node.title} loading="lazy" decoding="async" width={300} height={300} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingCart className="h-12 w-12" /></div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.node.title}</h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-primary">{parseFloat(price.amount).toFixed(2)} €</span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAdd} disabled={isLoading || !variant?.availableForSale}>
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </LocaleLink>
  );
}

interface SimilarProductsProps {
  vendor?: string;
  productType?: string;
  currentProductId?: string;
}

export function SimilarProducts({ vendor, productType, currentProductId }: SimilarProductsProps) {
  const { shopifyLanguage } = useI18n();
  const { data: products, isLoading } = useSimilarProducts(vendor, productType, currentProductId, shopifyLanguage);

  if (isLoading || !products || products.length === 0) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <h2 className="font-heading text-xl font-semibold mb-6">Ähnliche Produkte</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => (
          <SimilarProductCard key={p.node.id} product={p} />
        ))}
      </div>
    </section>
  );
}
