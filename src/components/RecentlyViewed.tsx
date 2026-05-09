import { LocaleLink } from "./LocaleLink";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useProductByHandle } from "@/hooks/useProducts";
import { usePrefetchProduct } from "@/hooks/usePrefetchProduct";
import { shopifyImageUrl, shopifyImageSrcSet } from "@/lib/shopifyImage";
import { useI18n } from "@/i18n";
import { ShoppingCart } from "lucide-react";

interface RecentlyViewedProps {
  /** Optional handle to exclude (e.g. current PDP) */
  excludeHandle?: string;
  /** Heading override */
  title?: string;
  /** Max items to render (default 8) */
  limit?: number;
  className?: string;
}

function MiniCard({ handle }: { handle: string }) {
  const { data: product } = useProductByHandle(handle);
  const prefetch = usePrefetchProduct();
  const { locale } = useI18n();

  if (!product) {
    return <div className="bg-muted animate-pulse rounded-lg aspect-[3/4]" aria-hidden="true" />;
  }

  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;
  const handlePrefetch = () => prefetch(handle);

  return (
    <LocaleLink
      to={`/product/${handle}`}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow block"
    >
      <div className="aspect-square bg-white overflow-hidden">
        {image ? (
          <img
            src={shopifyImageUrl(image.url, 300)}
            srcSet={shopifyImageSrcSet(image.url, [200, 300, 400])}
            sizes="(min-width:1024px) 200px, (min-width:640px) 25vw, 40vw"
            alt={image.altText || product.node.title}
            width={300}
            height={300}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-3">
        {product.node.vendor && (
          <p className="text-xs text-muted-foreground mb-0.5 truncate uppercase tracking-wider">
            {product.node.vendor}
          </p>
        )}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.node.title}
        </h3>
        {price && (
          <p className="text-sm font-bold text-foreground mt-1">
            {new Intl.NumberFormat(locale, { style: 'currency', currency: price.currencyCode })
              .format(parseFloat(price.amount))}
          </p>
        )}
      </div>
    </LocaleLink>
  );
}

export function RecentlyViewed({
  excludeHandle,
  title = "Kürzlich angesehen",
  limit = 8,
  className,
}: RecentlyViewedProps) {
  const handles = useRecentlyViewed(excludeHandle).slice(0, limit);
  if (handles.length === 0) return null;

  return (
    <section className={`py-10 ${className ?? ''}`} aria-label={title}>
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-xl md:text-2xl font-semibold mb-6">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {handles.map(handle => (
            <MiniCard key={handle} handle={handle} />
          ))}
        </div>
      </div>
    </section>
  );
}
