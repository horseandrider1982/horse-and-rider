import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, ShoppingCart, ArrowLeft, Sparkles, Phone, MessageSquare, Smartphone, Monitor } from "lucide-react";
import { CalendlyModal } from "@/components/CalendlyModal";
import beratungPortrait from "@/assets/beratung-portrait.png";
import { Button } from "@/components/ui/button";
import { useProductByHandle } from "@/hooks/useProducts";
import { useBrands } from "@/hooks/useBrands";
import { useProductConfigurator } from "@/hooks/useConfigurator";
import { useCartStore } from "@/stores/cartStore";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConfiguratorWizard } from "@/components/configurator/ConfiguratorWizard";
import { toast } from "sonner";
import type { ConfigurationState } from "@/types/configurator";

const STORAGE_KEY = (id: string) => `cfg_${id}`;

function loadConfig(productId: string): ConfigurationState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(productId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.isConfigured) return parsed;
  } catch {}
  return null;
}

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const { data: product, isLoading, error } = useProductByHandle(handle || "");
  const addItem = useCartStore(state => state.addItem);
  const cartLoading = useCartStore(state => state.isLoading);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [mainImage, setMainImage] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configState, setConfigState] = useState<ConfigurationState | null>(null);
  const [calendlyOpen, setCalendlyOpen] = useState(false);

  const shopifyProductId = product?.node?.id;
  const { data: configuratorData } = useProductConfigurator(shopifyProductId);
  const isConfigurator = !!configuratorData && configuratorData.groups.length > 0;
  const { data: brands } = useBrands();
  const brand = brands?.find(b => b.name.toLowerCase().trim() === product?.node?.vendor?.toLowerCase().trim());

  // Load saved config from localStorage
  useEffect(() => {
    if (shopifyProductId) {
      const saved = loadConfig(shopifyProductId);
      if (saved) setConfigState(saved);
    }
  }, [shopifyProductId]);

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
  const basePrice = selectedVariant ? parseFloat(selectedVariant.price.amount) : parseFloat(product.node.priceRange.minVariantPrice.amount);
  const totalPrice = basePrice + (configState?.totalPriceDelta ?? 0);

  const handleWizardComplete = (state: ConfigurationState) => {
    setConfigState(state);
    if (shopifyProductId) {
      localStorage.setItem(STORAGE_KEY(shopifyProductId), JSON.stringify(state));
    }
    toast.success("Konfiguration abgeschlossen", { position: "top-center" });
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    // Build line item attributes for configurator
    const attributes: Array<{ key: string; value: string }> = [];
    if (isConfigurator && configState?.isConfigured) {
      // Human-readable summary
      const summaryParts = configState.selections.map(sel => {
        const group = configuratorData!.groups.find(g => g.id === sel.groupId);
        if (!group) return '';
        let valDisplay = '';
        if (sel.type === 'text_input') valDisplay = String(sel.value);
        else if (sel.type === 'checkbox') valDisplay = sel.value === true ? 'Ja' : 'Nein';
        else if (Array.isArray(sel.value)) valDisplay = sel.value.map(id => group.values.find(v => v.id === id)?.name || id).join(', ');
        else if (typeof sel.value === 'string') valDisplay = group.values.find(v => v.id === sel.value)?.name || String(sel.value);
        return `${group.name}: ${valDisplay}`;
      }).filter(Boolean);

      attributes.push({ key: 'Konfiguration', value: summaryParts.join(' | ') });
      attributes.push({ key: '_cfg_price_delta_total', value: configState.totalPriceDelta.toFixed(2) });

      // Per-group keys
      configState.selections.forEach(sel => {
        const group = configuratorData!.groups.find(g => g.id === sel.groupId);
        if (group) {
          let val = '';
          if (sel.type === 'text_input') val = String(sel.value);
          else if (sel.type === 'checkbox') val = sel.value === true ? 'Ja' : 'Nein';
          else if (Array.isArray(sel.value)) val = sel.value.map(id => group.values.find(v => v.id === id)?.name || id).join(', ');
          else if (typeof sel.value === 'string') val = group.values.find(v => v.id === sel.value)?.name || '';
          attributes.push({ key: `cfg_${group.name}`, value: val });
        }
      });
    }

    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
      ...(attributes.length > 0 ? { attributes } : {}),
    });
    toast.success("In den Warenkorb gelegt", { description: product.node.title, position: "top-center" });
  };

  const canAddToCart = !isConfigurator || configState?.isConfigured;

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
              {brand?.logoUrl && (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="h-6 w-auto object-contain mb-2"
                  style={{ filter: 'brightness(0)' }}
                />
              )}
              <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">{product.node.title}</h1>
              <p className="text-2xl font-bold text-primary mb-4">
                {isConfigurator && configState?.isConfigured ? (
                  <>{totalPrice.toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">(inkl. Konfiguration)</span></>
                ) : (
                  <>{basePrice.toFixed(2)} €</>
                )}
              </p>

              {/* Variant selection */}
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

              {/* Configurator buttons */}
              {isConfigurator && (
                <div className="mb-4">
                  <Button
                    onClick={() => setWizardOpen(true)}
                    variant="outline"
                    size="lg"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground mb-2"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {configState?.isConfigured ? 'Konfiguration ändern' : 'Jetzt konfigurieren'}
                  </Button>
                  {configState?.isConfigured && (
                    <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                      ✓ Konfiguration abgeschlossen
                      {configState.totalPriceDelta !== 0 && ` (Aufpreis: ${configState.totalPriceDelta > 0 ? '+' : ''}${configState.totalPriceDelta.toFixed(2)} €)`}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleAddToCart}
                disabled={cartLoading || !selectedVariant?.availableForSale || !canAddToCart}
                className="w-full bg-primary text-primary-foreground hover:opacity-90"
                size="lg"
              >
                {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                {!canAddToCart ? 'Bitte zuerst konfigurieren' : selectedVariant?.availableForSale ? "In den Warenkorb" : "Nicht verfügbar"}
              </Button>

              {product.node.description && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="font-semibold mb-2">Beschreibung</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{product.node.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Beratungs-Strip */}
          <div className="mt-10 bg-muted/50 border border-border rounded-lg p-6 flex flex-col md:flex-row items-center gap-6">
            <img
              src={beratungPortrait}
              alt="Persönliche Beratung"
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 text-center md:text-left">
              <p className="font-semibold text-foreground">Beratung nötig?</p>
              <p className="font-semibold text-foreground">Fragen zum Produkt? Unsicher mit der Größe?</p>
              <p className="text-sm text-muted-foreground mt-1">Kontaktieren Sie uns einfach über einen der folgenden Wege:</p>
            </div>
            <div className="flex items-center gap-6 flex-shrink-0">
              <a href="tel:+4941728319873" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
                <Phone className="h-7 w-7" />
                <span className="text-xs font-medium">Telefon</span>
              </a>
              <Link to="/kontakt" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
                <MessageSquare className="h-7 w-7" />
                <span className="text-xs font-medium">Kontaktformular</span>
              </Link>
              <a href="https://wa.me/4941728319873" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
                <Smartphone className="h-7 w-7" />
                <span className="text-xs font-medium">WhatsApp</span>
              </a>
            </div>
          </div>

        </div>
      </main>
      <Footer />

      {isConfigurator && configuratorData && (
        <ConfiguratorWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          groups={configuratorData.groups}
          basePrice={basePrice}
          currencyCode={product.node.priceRange.minVariantPrice.currencyCode}
          productTitle={product.node.title}
          onComplete={handleWizardComplete}
          initialSelections={configState?.selections}
        />
      )}
    </div>
  );
};

export default ProductDetail;
