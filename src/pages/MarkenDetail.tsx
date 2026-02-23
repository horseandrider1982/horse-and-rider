import { useParams, Link } from "react-router-dom";
import { Loader2, ChevronLeft, ShoppingCart } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useBrands, useBrandProducts } from "@/hooks/useBrands";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import type { ShopifyProduct } from "@/lib/shopify";

function ProductCard({ product }: { product: ShopifyProduct }) {
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
    <div className="prose prose-sm max-w-none text-muted-foreground">
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

export default function MarkenDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: brands, isLoading: brandsLoading } = useBrands();

  const brand = brands?.find((b) => b.slug === slug);
  const vendorName = brand?.name || "";
  const { data: products, isLoading: productsLoading } = useBrandProducts(vendorName, !!vendorName);

  if (brandsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar />
        <Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground mb-4">Marke nicht gefunden.</p>
          <Button asChild variant="outline">
            <Link to="/unsere-marken"><ChevronLeft className="h-4 w-4 mr-1" />Alle Marken</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-card py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link to="/unsere-marken" className="hover:text-primary transition-colors">Unsere Marken</Link>
              <span>/</span>
              <span className="text-foreground">{brand.name}</span>
            </div>
            <div className="flex items-center gap-5">
              {brand.logoUrl && (
                <img src={brand.logoUrl} alt={`${brand.name} Logo`} className="h-16 md:h-20 w-auto object-contain brightness-0" />
              )}
              <h1 className="font-heading text-3xl md:text-4xl font-bold">{brand.name}</h1>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="container mx-auto px-4 py-10">
          <h2 className="font-heading text-xl md:text-2xl font-bold mb-6">
            Produkte von {brand.name}
          </h2>

          {productsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => (
                <ProductCard key={p.node.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              Aktuell keine Produkte von {brand.name} verfügbar.
            </p>
          )}
        </section>

        {/* SEO Text */}
        <section className="container mx-auto px-4 pb-12">
          {brand.seoText ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: brand.seoText }}
            />
          ) : (
            <DefaultSeoText brand={brand.name} />
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
