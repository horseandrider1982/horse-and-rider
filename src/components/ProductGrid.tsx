import { Link } from "react-router-dom";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";
import type { ShopifyProduct } from "@/lib/shopify";

const ProductCard = ({ product }: { product: ShopifyProduct }) => {
  const addItem = useCartStore(state => state.addItem);
  const isLoading = useCartStore(state => state.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
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
    toast.success("In den Warenkorb gelegt", {
      description: product.node.title,
      position: "top-center",
    });
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
            {parseFloat(price.amount).toFixed(2)} {price.currencyCode === 'EUR' ? '€' : price.currencyCode}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleAddToCart}
            disabled={isLoading || !variant?.availableForSale}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </Link>
  );
};

export const ProductGrid = () => {
  const { data: products, isLoading, error } = useProducts(20);

  return (
    <section id="produkte" className="py-12 bg-card">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">
          Unsere Produkte
        </h2>

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">
            Produkte konnten nicht geladen werden.
          </div>
        )}

        {!isLoading && !error && products && products.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Noch keine Produkte vorhanden</p>
            <p className="text-sm text-muted-foreground">
              Erstelle dein erstes Produkt, indem du mir im Chat sagst, was du verkaufen möchtest.
            </p>
          </div>
        )}

        {products && products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.node.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
