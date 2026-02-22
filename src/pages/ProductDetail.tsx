import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { Loader2, ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductByHandle } from "@/hooks/useProducts";
import { useCartStore } from "@/stores/cartStore";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const { data: product, isLoading, error } = useProductByHandle(handle || "");
  const addItem = useCartStore(state => state.addItem);
  const cartLoading = useCartStore(state => state.isLoading);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [mainImage, setMainImage] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar /><Header />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar /><Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Produkt nicht gefunden</p>
            <Link to="/" className="text-primary hover:underline">Zurück zum Shop</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const variants = product.node.variants.edges;
  const selectedVariant = variants[selectedVariantIndex]?.node;
  const images = product.node.images.edges;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
    });
    toast.success("In den Warenkorb gelegt", { description: product.node.title, position: "top-center" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar /><Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="h-4 w-4" /> Zurück zum Shop
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3">
                {images[mainImage] ? (
                  <img src={images[mainImage].node.url} alt={images[mainImage].node.altText || product.node.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="h-16 w-16 text-muted-foreground" /></div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setMainImage(i)} className={`w-16 h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-colors ${i === mainImage ? "border-primary" : "border-transparent"}`}>
                      <img src={img.node.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">{product.node.title}</h1>
              <p className="text-2xl font-bold text-primary mb-4">
                {selectedVariant ? parseFloat(selectedVariant.price.amount).toFixed(2) : parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2)} €
              </p>
              {product.node.options.length > 0 && product.node.options[0].name !== "Title" && (
                <div className="mb-6">
                  {product.node.options.map((option) => (
                    <div key={option.name} className="mb-3">
                      <label className="text-sm font-medium mb-2 block">{option.name}</label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const variantIdx = variants.findIndex(v => v.node.selectedOptions.some(o => o.name === option.name && o.value === value));
                          return (
                            <button key={value} onClick={() => variantIdx >= 0 && setSelectedVariantIndex(variantIdx)}
                              className={`px-3 py-1.5 text-sm rounded border transition-colors ${variantIdx === selectedVariantIndex ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={handleAddToCart} disabled={cartLoading || !selectedVariant?.availableForSale} className="w-full bg-primary text-primary-foreground hover:opacity-90" size="lg">
                {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                {selectedVariant?.availableForSale ? "In den Warenkorb" : "Nicht verfügbar"}
              </Button>
              {product.node.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold mb-2">Beschreibung</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{product.node.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
