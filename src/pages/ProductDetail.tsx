import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2, ShoppingCart, Sparkles, Phone, MessageSquare, Smartphone, Monitor, PenTool } from "lucide-react";
import { CalendlyModal } from "@/components/CalendlyModal";
import { ProductContactModal } from "@/components/ProductContactModal";
import beratungPortrait from "@/assets/beratung-portrait.png";
import { Button } from "@/components/ui/button";
import { useProductByHandle } from "@/hooks/useProducts";
import { useBrands } from "@/hooks/useBrands";
import { useProductConfigurator } from "@/hooks/useConfigurator";
import { useCartStore } from "@/stores/cartStore";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ConfiguratorWizard } from "@/components/configurator/ConfiguratorWizard";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { EngravingDialog, ENGRAVING_PRICE } from "@/components/EngravingDialog";
import { PaymentIcons } from "@/components/PaymentIcons";
import { trackViewItem, trackAddToCart } from "@/lib/ga4";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/JsonLd";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { EngravingResult } from "@/components/EngravingDialog";
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
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const { data: product, isLoading, error } = useProductByHandle(handle || "");
  const addItem = useCartStore(state => state.addItem);
  const cartLoading = useCartStore(state => state.isLoading);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [mainImage, setMainImage] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [configState, setConfigState] = useState<ConfigurationState | null>(null);
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [engravingOpen, setEngravingOpen] = useState(false);

  const shopifyProductId = product?.node?.id;
  const { data: configuratorData } = useProductConfigurator(shopifyProductId);
  const nonGravurGroups = configuratorData?.groups.filter(g => !g.name.toLowerCase().includes('gravur')) ?? [];
  const isConfigurator = nonGravurGroups.length > 0;
  const isEngravable = !!configuratorData && configuratorData.groups.some(g => g.name.toLowerCase().includes('gravur'));
  const { data: brands } = useBrands();
  const brand = brands?.find(b => b.name.toLowerCase().trim() === product?.node?.vendor?.toLowerCase().trim());

  useEffect(() => {
    if (shopifyProductId) {
      const saved = loadConfig(shopifyProductId);
      if (saved) setConfigState(saved);
    }
  }, [shopifyProductId]);

  // Dynamic meta tags – build keyword-rich description
  const metaDescription = product?.node
    ? (() => {
        const title = product.node.title;
        const vendor = product.node.vendor;
        const price = parseFloat(product.node.priceRange.minVariantPrice.amount).toFixed(2);
        const currency = product.node.priceRange.minVariantPrice.currencyCode === 'EUR' ? '€' : product.node.priceRange.minVariantPrice.currencyCode;
        const rawDesc = product.node.description?.replace(/\s+/g, ' ').trim() || '';
        const snippet = rawDesc.slice(0, 80);
        return `${title} von ${vendor} ab ${price} ${currency} kaufen. ${snippet}…`.slice(0, 160);
      })()
    : undefined;

  usePageMeta({
    title: product?.node?.title,
    description: metaDescription,
    ogImage: product?.node?.images?.edges?.[0]?.node?.url,
    ogType: "product",
    canonicalPath: handle ? `/${locale}/product/${handle}` : undefined,
  });

  // GA4 view_item event – fires once per product
  useEffect(() => {
    if (!product) return;
    trackViewItem(product);
  }, [product?.node?.id]);

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
            <p className="text-muted-foreground mb-4">{t("product.not_found")}</p>
            <LocaleLink to="/" className="text-primary hover:underline">{t("product.back")}</LocaleLink>
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
    toast.success(t("product.config_complete"), { position: "top-center" });
  };

  const addToCartWithAttributes = async (extraAttributes: Array<{ key: string; value: string }> = []) => {
    if (!selectedVariant) return;
    const attributes: Array<{ key: string; value: string }> = [];
    if (isConfigurator && configState?.isConfigured) {
      const summaryParts = configState.selections.map(sel => {
        const group = configuratorData!.groups.find(g => g.id === sel.groupId);
        if (!group) return '';
        let valDisplay = '';
        if (sel.type === 'text_input') valDisplay = String(sel.value);
        else if (sel.type === 'checkbox') valDisplay = sel.value === true ? t("general.yes") : t("general.no");
        else if (Array.isArray(sel.value)) valDisplay = sel.value.map(id => group.values.find(v => v.id === id)?.name || id).join(', ');
        else if (typeof sel.value === 'string') valDisplay = group.values.find(v => v.id === sel.value)?.name || String(sel.value);
        return `${group.name}: ${valDisplay}`;
      }).filter(Boolean);
      attributes.push({ key: 'Konfiguration', value: summaryParts.join(' | ') });
      attributes.push({ key: '_cfg_price_delta_total', value: configState.totalPriceDelta.toFixed(2) });
      configState.selections.forEach(sel => {
        const group = configuratorData!.groups.find(g => g.id === sel.groupId);
        if (group) {
          let val = '';
          if (sel.type === 'text_input') val = String(sel.value);
          else if (sel.type === 'checkbox') val = sel.value === true ? t("general.yes") : t("general.no");
          else if (Array.isArray(sel.value)) val = sel.value.map(id => group.values.find(v => v.id === id)?.name || id).join(', ');
          else if (typeof sel.value === 'string') val = group.values.find(v => v.id === sel.value)?.name || '';
          attributes.push({ key: `cfg_${group.name}`, value: val });
        }
      });
    }
    attributes.push(...extraAttributes);
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || [],
      ...(attributes.length > 0 ? { attributes } : {}),
    });
    trackAddToCart(product, selectedVariant.id, 1);
    toast.success(t("products.added_to_cart"), { description: product.node.title, position: "top-center" });
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    if (isEngravable) {
      setEngravingOpen(true);
      return;
    }
    await addToCartWithAttributes();
  };

  const handleEngravingSkip = async () => {
    await addToCartWithAttributes();
  };

  const handleEngravingConfirm = async (engraving: EngravingResult) => {
    // 1. Add main product
    await addToCartWithAttributes([
      { key: 'Gravur', value: `${engraving.text} (${engraving.fontLabel})` },
      { key: '_gravur_text', value: engraving.text },
      { key: '_gravur_font', value: engraving.fontLabel },
    ]);
    // 2. Add engraving as separate line item
    const engravingVariantId = 'gid://shopify/ProductVariant/57528290705733';
    await addItem({
      product: {
        node: {
          id: 'gid://shopify/Product/15777060782405',
          title: 'Individuelle Gravur',
          description: '',
          handle: 'individuelle-gravur',
          vendor: '',
          priceRange: { minVariantPrice: { amount: ENGRAVING_PRICE.toFixed(2), currencyCode: 'EUR' } },
          images: { edges: product.node.images.edges.length > 0 ? [product.node.images.edges[0]] : [] },
          variants: { edges: [{ node: { id: engravingVariantId, title: 'Default Title', price: { amount: ENGRAVING_PRICE.toFixed(2), currencyCode: 'EUR' }, availableForSale: true, selectedOptions: [] } }] },
          options: [],
        },
      },
      variantId: engravingVariantId,
      variantTitle: 'Default Title',
      price: { amount: ENGRAVING_PRICE.toFixed(2), currencyCode: 'EUR' },
      quantity: 1,
      selectedOptions: [],
      attributes: [
        { key: '_gravur_text', value: engraving.text },
        { key: '_gravur_font', value: engraving.fontLabel },
        { key: '_gravur_fuer', value: product.node.title },
      ],
    });
  };

  const canAddToCart = !isConfigurator || configState?.isConfigured;

  const productImages = images.map(e => e.node.url);
  const firstVariantSku = variants[0]?.node?.sku;

  return (
    <div className="min-h-screen flex flex-col">
      <ProductJsonLd
        name={product.node.title}
        description={product.node.description}
        handle={product.node.handle}
        images={productImages}
        price={selectedVariant?.price.amount || product.node.priceRange.minVariantPrice.amount}
        currency={selectedVariant?.price.currencyCode || product.node.priceRange.minVariantPrice.currencyCode}
        available={selectedVariant?.availableForSale ?? true}
        sku={firstVariantSku}
        brand={product.node.vendor}
        locale={locale}
      />
      <BreadcrumbJsonLd items={[
        { name: "Home", url: `https://horse-and-rider.de/${locale}` },
        ...(brand ? [{ name: brand.name, url: `https://horse-and-rider.de/${locale}/unsere-marken/${brand.slug}` }] : []),
        { name: product.node.title, url: `https://horse-and-rider.de/${locale}/product/${product.node.handle}` },
      ]} />
      <TopBar /><Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <LocaleLink to="/">{t("nav.home")}</LocaleLink>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {brand && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <LocaleLink to={`/unsere-marken/${brand.slug}`}>{brand.name}</LocaleLink>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </>
              )}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{product.node.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square rounded-lg overflow-hidden bg-white mb-3">
                {images[mainImage] ? (
                  <img src={images[mainImage].node.url} alt={images[mainImage].node.altText || product.node.title} className="w-full h-full object-contain" />
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
                <img src={brand.logoUrl} alt={brand.name} className="h-6 w-auto object-contain mb-2" style={{ filter: 'brightness(0)' }} />
              )}
              <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3">{product.node.title}</h1>
              <p className="text-2xl font-bold text-primary mb-4">
                {isConfigurator && configState?.isConfigured ? (
                  <>{totalPrice.toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">{t("product.incl_config")}</span></>
                ) : (
                  <>{basePrice.toFixed(2)} €</>
                )}
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

              {isConfigurator && (
                <div className="mb-4">
                  <Button onClick={() => setWizardOpen(true)} variant="outline" size="lg" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground mb-2">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {configState?.isConfigured ? t("product.configure_change") : t("product.configure_now")}
                  </Button>
                  {configState?.isConfigured && (
                    <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                      ✓ {t("product.config_complete")}
                      {configState.totalPriceDelta !== 0 && ` (Aufpreis: ${configState.totalPriceDelta > 0 ? '+' : ''}${configState.totalPriceDelta.toFixed(2)} €)`}
                    </div>
                  )}
                </div>
              )}

              {isEngravable && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-secondary/50 text-sm text-muted-foreground">
                  <PenTool className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Dieses Produkt ist gegen Aufpreis gravierbar. Legen Sie die gewünschte Größe in den Warenkorb.</span>
                </div>
              )}

              <Button onClick={handleAddToCart} disabled={cartLoading || !selectedVariant?.availableForSale || !canAddToCart} className={`w-full ${selectedVariant?.availableForSale !== false ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'}`} size="lg">
                {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                {!canAddToCart ? t("product.configure_first") : selectedVariant?.availableForSale ? t("product.add_to_cart") : t("product.unavailable")}
              </Button>

              <PaymentIcons />

              {/* Beratungs-Strip */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-4 mb-4">
                  <img src={beratungPortrait} alt={t("product.advice_title")} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-base text-foreground">{t("product.advice_title")}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("product.advice_subtitle")}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <a href="tel:+4941726403" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                    <Phone className="h-12 w-12" />
                    <span className="text-sm font-medium">{t("product.phone")}</span>
                  </a>
                  <button onClick={() => setContactOpen(true)} className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                    <MessageSquare className="h-12 w-12" />
                    <span className="text-sm font-medium">{t("product.contact_form")}</span>
                  </button>
                  <button onClick={() => setCalendlyOpen(true)} className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                    <Monitor className="h-12 w-12" />
                    <span className="text-sm font-medium">{t("product.online_advice")}</span>
                  </button>
                  <a href="https://wa.me/4941726403" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                    <Smartphone className="h-12 w-12" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {product.node.description && (
            <div className="mt-10 pt-8 border-t border-border">
              <h3 className="font-heading text-xl font-semibold mb-4">{t("product.description")}</h3>
              <p className="text-base text-muted-foreground leading-relaxed">{product.node.description}</p>
            </div>
          )}

          {(selectedVariant?.sku || selectedVariant?.barcode) && (
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                {selectedVariant.sku && (
                  <span><span className="font-medium text-foreground">Artikelnummer:</span> {selectedVariant.sku}</span>
                )}
                {selectedVariant.barcode && (
                  <span><span className="font-medium text-foreground">EAN/GTIN:</span> {selectedVariant.barcode}</span>
                )}
              </div>
            </div>
          )}

          {brand && (brand.gpsrStreet || brand.gpsrCity || brand.gpsrEmail) && (
            <div className="mt-6 pt-4 border-t border-border">
              <strong className="text-sm text-foreground">Hersteller:</strong>
              <div className="text-sm text-muted-foreground mt-1">
                {brand.name && <>{brand.name}<br /></>}
                {(brand.gpsrStreet || brand.gpsrHousenumber) && <>{brand.gpsrStreet} {brand.gpsrHousenumber}<br /></>}
                {(brand.gpsrPostalcode || brand.gpsrCity) && <>{brand.gpsrPostalcode} {brand.gpsrCity}<br /></>}
                {brand.gpsrCountry && <>{brand.gpsrCountry}<br /></>}
                {brand.gpsrEmail && <>{brand.gpsrEmail}<br /></>}
                {brand.gpsrHomepage && <>{brand.gpsrHomepage}</>}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {isConfigurator && configuratorData && (
        <ConfiguratorWizard open={wizardOpen} onOpenChange={setWizardOpen} groups={nonGravurGroups} basePrice={basePrice} currencyCode={product.node.priceRange.minVariantPrice.currencyCode} productTitle={product.node.title} onComplete={handleWizardComplete} initialSelections={configState?.selections} />
      )}
      <CalendlyModal open={calendlyOpen} onOpenChange={setCalendlyOpen} />
      <ProductContactModal open={contactOpen} onOpenChange={setContactOpen} productTitle={product.node.title} productId={handle || ''} />
      {isEngravable && (
        <EngravingDialog
          open={engravingOpen}
          onOpenChange={setEngravingOpen}
          onSkip={handleEngravingSkip}
          onConfirm={handleEngravingConfirm}
          productTitle={product.node.title}
        />
      )}
    </div>
  );
};

export default ProductDetail;
