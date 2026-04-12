import { LocaleLink } from "./LocaleLink";
import { useI18n } from "@/i18n";
import type { ShopifyProduct } from "@/lib/shopify";

interface ListingProductCardProps {
  product: ShopifyProduct;
}

export function ListingProductCard({ product }: ListingProductCardProps) {
  const { locale } = useI18n();
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <LocaleLink
      to={`/product/${product.node.handle}`}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow block"
    >
      <div className="aspect-square bg-white overflow-hidden">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || product.node.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            width={400}
            height={400}
            loading="lazy"
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
