import { LocaleLink } from "./LocaleLink";
import { useI18n } from "@/i18n";
import type { ShopifyProduct } from "@/lib/shopify";
import { trackSelectItem } from "@/lib/ga4";

interface ListingProductCardProps {
  product: ShopifyProduct;
  listName?: string;
  index?: number;
}

export function ListingProductCard({ product, listName, index }: ListingProductCardProps) {
  const { locale } = useI18n();
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleClick = () => {
    if (listName) trackSelectItem(product, listName, index);
  };

  // Shopify CDN image transform: deliver right-sized WebP to cut payload
  const optimizedSrc = image
    ? (() => {
        try {
          const u = new URL(image.url);
          u.searchParams.set("width", "400");
          return u.toString();
        } catch {
          return image.url;
        }
      })()
    : "";
  const srcSet = image
    ? (() => {
        try {
          const make = (w: number) => {
            const u = new URL(image.url);
            u.searchParams.set("width", String(w));
            return `${u.toString()} ${w}w`;
          };
          return [make(300), make(400), make(600), make(800)].join(", ");
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const isAboveFold = typeof index === "number" && index < 8;

  return (
    <LocaleLink
      to={`/product/${product.node.handle}`}
      onClick={handleClick}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow block"
    >
      <div className="aspect-square bg-white overflow-hidden">
        {image ? (
          <img
            src={optimizedSrc}
            srcSet={srcSet}
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            alt={image.altText || product.node.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            width={400}
            height={400}
            loading={isAboveFold ? "eager" : "lazy"}
            // @ts-expect-error fetchpriority is a valid HTML attribute
            fetchpriority={isAboveFold ? "high" : "auto"}
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">
            🛍️
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
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: price.currencyCode,
            }).format(parseFloat(price.amount))}
          </p>
        )}
      </div>
    </LocaleLink>
  );
}
