import { ShoppingCart, Loader2 } from "lucide-react";
import { LocaleLink } from "./LocaleLink";
import { useProducts, useProductByHandle } from "@/hooks/useProducts";
import { useHomepageProductHandles } from "@/hooks/useHomepageProducts";
import { useI18n } from "@/i18n";
import type { ShopifyProduct } from "@/lib/shopify";
import { shopifyImageUrl } from "@/lib/shopifyImage";

const ProductCard = ({ product }: { product: ShopifyProduct }) => {
  const { t } = useI18n();
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <LocaleLink to={`/product/${product.node.handle}`} className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
      <div className="aspect-square overflow-hidden bg-white">
        {image ? (
          <img src={shopifyImageUrl(image.url, 300)} srcSet={`${shopifyImageUrl(image.url, 300)} 1x, ${shopifyImageUrl(image.url, 450)} 1.5x`} alt={image.altText || product.node.title} width={300} height={300} loading="lazy" decoding="async" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingCart className="h-12 w-12" /></div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.node.title}</h3>
        <span className="font-bold text-primary">{parseFloat(price.amount).toFixed(2)} {price.currencyCode === 'EUR' ? '€' : price.currencyCode}</span>
      </div>
    </LocaleLink>
  );
};

function FeaturedProductCard({ handle }: { handle: string }) {
  const { data: product, isLoading } = useProductByHandle(handle);
  if (isLoading) return <div className="bg-muted animate-pulse rounded-lg aspect-square" />;
  if (!product) return null;
  return <ProductCard product={product} />;
}

export const ProductGrid = () => {
  const { data: handles, isLoading: handlesLoading } = useHomepageProductHandles();
  const hasFeatured = handles && handles.length > 0;

  // Fallback: load generic products if no featured handles configured
  const { data: products, isLoading: productsLoading, error } = useProducts(20);
  const { t } = useI18n();

  const isLoading = handlesLoading || (!hasFeatured && productsLoading);

  return (
    <section id="produkte" className="py-12 bg-card">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">{t("products.title")}</h2>
        {isLoading && (<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>)}

        {!isLoading && hasFeatured && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {handles.map((handle) => (
              <FeaturedProductCard key={handle} handle={handle} />
            ))}
          </div>
        )}

        {!isLoading && !hasFeatured && (
          <>
            {error && (<div className="text-center py-16 text-muted-foreground">{t("products.loading_error")}</div>)}
            {!error && products && products.length === 0 && (
              <div className="text-center py-16">
                <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg text-muted-foreground mb-2">{t("products.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("products.empty_hint")}</p>
              </div>
            )}
            {products && products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.slice(0, 4).map((product) => (<ProductCard key={product.node.id} product={product} />))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
