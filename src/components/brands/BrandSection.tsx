import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { useBrandProducts, type Brand } from "@/hooks/useBrands";
import { toast } from "sonner";
import type { ShopifyProduct } from "@/lib/shopify";

function BrandProductCard({ product }: { product: ShopifyProduct }) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("In den Warenkorb gelegt", { description: product.node.title, position: "top-center" });
  };

  return (
    <Link
      to={`/product/${product.node.handle}`}
      className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image.url}
            alt={image.altText || product.node.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.node.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary">
            {parseFloat(price.amount).toFixed(2)} {price.currencyCode === "EUR" ? "€" : price.currencyCode}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleAdd}
            disabled={isLoading || !variant?.availableForSale}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </Link>
  );
}

function DefaultSeoText({ brand }: { brand: string }) {
  return (
    <div className="mt-8 prose prose-sm max-w-none text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">Über {brand}</h3>
      <p>
        Entdecken Sie das Sortiment von {brand} in unserem Online-Shop. Wir führen eine sorgfältige
        Auswahl an Produkten von {brand}, die höchsten Ansprüchen im Reitsport gerecht werden.
      </p>
      <p>
        Ob für den täglichen Einsatz im Stall, beim Training oder auf dem Turnier – bei uns finden Sie
        qualitativ hochwertige Artikel dieser Marke. Alle Produkte von {brand} werden von uns persönlich
        geprüft und ausgewählt, damit Sie sich auf erstklassige Qualität verlassen können.
      </p>
      <p>
        Stöbern Sie durch unser Angebot und lassen Sie sich von der Vielfalt inspirieren. Bei Fragen zu
        den Produkten von {brand} stehen wir Ihnen gerne telefonisch oder per E-Mail zur Verfügung.
      </p>
    </div>
  );
}

export function BrandSection({ brand }: { brand: Brand }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { data: products, isLoading } = useBrandProducts(brand.name, visible);

  return (
    <div ref={ref} id={`brand-${brand.slug}`} className="scroll-mt-32">
      <div className="flex items-center gap-4 mb-6">
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt={`${brand.name} Logo`}
            className="h-12 w-auto object-contain"
            loading="lazy"
          />
        )}
        <h2 className="text-xl md:text-2xl font-heading font-bold">{brand.name}</h2>
      </div>

      {!visible || isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p) => (
            <BrandProductCard key={p.node.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-4">Aktuell keine Produkte von {brand.name} verfügbar.</p>
      )}

      {brand.seoText ? (
        <div
          className="mt-8 prose prose-sm max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: brand.seoText }}
        />
      ) : (
        <DefaultSeoText brand={brand.name} />
      )}
    </div>
  );
}
