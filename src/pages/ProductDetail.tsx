import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Loader2, ShoppingCart, Sparkles, Phone, MessageSquare, Smartphone, Monitor, PenTool, Truck } from "lucide-react";
import { CalendlyModal } from "@/components/CalendlyModal";
import { ProductContactModal } from "@/components/ProductContactModal";
import beratungPortrait from "@/assets/beratung-portrait.png";
import { Button } from "@/components/ui/button";
import { useProductByHandle } from "@/hooks/useProducts";
import type { ShopifyMetafield } from "@/lib/shopify";
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
import { SimilarProducts } from "@/components/SimilarProducts";

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

function getMetafieldValue(metafields: (ShopifyMetafield | null)[] | undefined, key: string): string | null {
  if (!metafields) return null;
  const mf = metafields.find(m => m && m.key === key);
  return mf?.value ?? null;
}

interface AvailabilityInfo {
  canOrder: boolean;
  deliveryTime: string | null;
  isSupplierStock: boolean;
}

function computeAvailability(
  variantAvailableForSale: boolean,
  variantCurrentlyNotInStock?: boolean,
  variantMetafields?: (ShopifyMetafield | null)[],
  productMetafields?: (ShopifyMetafield | null)[],
  isSingleVariant?: boolean,
): AvailabilityInfo {
  // Check metafields: for single-variant products, fall back to product-level metafields
  const mf = isSingleVariant ? productMetafields : variantMetafields;
  const lieferantenbestand = getMetafieldValue(mf, 'lieferantenbestand');
  const ueberverkauf = getMetafieldValue(mf, 'ueberverkauf');
  const lieferzeit = getMetafieldValue(mf, 'lieferzeit');

  // Also check variant-level for single-variant (in case fields are on variant too)
  const varLieferantenbestand = getMetafieldValue(variantMetafields, 'lieferantenbestand');
  const varUeberverkauf = getMetafieldValue(variantMetafields, 'ueberverkauf');
  const varLieferzeit = getMetafieldValue(variantMetafields, 'lieferzeit');

  const bestLieferantenbestand = varLieferantenbestand || lieferantenbestand;
  const bestUeberverkauf = varUeberverkauf || ueberverkauf;
  const bestLieferzeit = varLieferzeit || lieferzeit;

  const hasSupplierStock = bestLieferantenbestand !== null && parseInt(bestLieferantenbestand, 10) > 0;
  const allowOversell = bestUeberverkauf === '1';
  const hasOwnStock = variantAvailableForSale && !variantCurrentlyNotInStock;

  // Own stock always wins and gets the standard delivery time.
  if (hasOwnStock) {
    return { canOrder: true, deliveryTime: '1 - 3 Werktage', isSupplierStock: false };
  }

  // No own stock left: supplier stock with oversell allowed can still be ordered
  // and should show the supplier delivery time instead of the default one.
  if (hasSupplierStock && allowOversell) {
    return {
      canOrder: true,
      deliveryTime: bestLieferzeit || 'Lieferzeit auf Anfrage',
      isSupplierStock: true,
    };
  }

  return { canOrder: false, deliveryTime: null, isSupplierStock: false };
}

const ProductDetail = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { handle } = useParams<{ handle: string }>();
  const { data: product, isLoading, error } = useProductByHandle(handle || "");
  const addItem = useCartStore(state => state.addItem);
  const cartLoading = useCartStore(state => state.isLoading);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
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

  const variants = product?.node?.variants?.edges;
  const options = product?.node?.options?.filter(o => o.name !== 'Title') ?? [];
  const isSingleVariant = variants ? variants.length === 1 && (variants[0]?.node?.title === 'Default Title' || !options.length) : false;

  // Initialize selectedOptions from first variant on product load
  useEffect(() => {
    if (variants?.length && options.length > 0) {
      const firstVariant = variants[0].node;
      const initial: Record<string, string> = {};
      firstVariant.selectedOptions.forEach(o => {
        if (o.name !== 'Title') initial[o.name] = o.value;
      });
      setSelectedOptions(initial);
    }
  }, [product?.node?.id]);

  // Helper: check if a variant is orderable (local stock OR supplier stock)
  const isVariantOrderable = useMemo(() => {
    if (!variants) return () => false;
    return (variant: typeof variants[0]['node']) => {
      return computeAvailability(
        variant.availableForSale,
        variant.currentlyNotInStock,
        variant.metafields,
        product?.node?.metafields,
        isSingleVariant,
      ).canOrder;
    };
  }, [variants, product?.node?.metafields, isSingleVariant]);

  // Find the variant matching all selected options
  const selectedVariant = useMemo(() => {
    if (!variants || options.length === 0) return variants?.[0]?.node;
    const allSelected = options.every(o => selectedOptions[o.name]);
    if (!allSelected) return undefined;
    const match = variants.find(v =>
      options.every(o => v.node.selectedOptions.some(so => so.name === o.name && so.value === selectedOptions[o.name]))
    );
    return match?.node;
  }, [variants, options, selectedOptions]);

  // For each option, determine which values are available given the OTHER selected options
  const optionAvailability = useMemo(() => {
    if (!variants) return {};
    const result: Record<string, Record<string, boolean>> = {};
    for (const option of options) {
      result[option.name] = {};
      for (const value of option.values) {
        // Find all variants that match this value AND all other currently selected options
        const matchingVariants = variants.filter(v => {
          const hasThisValue = v.node.selectedOptions.some(so => so.name === option.name && so.value === value);
          if (!hasThisValue) return false;
          // Check all OTHER selected options match
          return options.every(otherOpt => {
            if (otherOpt.name === option.name) return true;
            const otherSelected = selectedOptions[otherOpt.name];
            if (!otherSelected) return true; // no filter on unselected options
            return v.node.selectedOptions.some(so => so.name === otherOpt.name && so.value === otherSelected);
          });
        });
        // Value is available if at least one matching variant is orderable
        result[option.name][value] = matchingVariants.some(v => isVariantOrderable(v.node));
      }
    }
    return result;
  }, [variants, options, selectedOptions, isVariantOrderable]);

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
    setMainImage(0);
  };

  const handleResetToOverview = () => {
    setSelectedOptions({});
    setMainImage(0);
  };

  const availability = useMemo(() => {
    if (!selectedVariant) return { canOrder: false, deliveryTime: null, isSupplierStock: false };
    return computeAvailability(
      selectedVariant.availableForSale,
      selectedVariant.currentlyNotInStock,
      selectedVariant.metafields,
      product?.node?.metafields,
      isSingleVariant,
    );
  }, [selectedVariant, product?.node?.metafields, isSingleVariant]);

  useEffect(() => {
    if (shopifyProductId) {
      const saved = loadConfig(shopifyProductId);
      if (saved) setConfigState(saved);
    }
  }, [shopifyProductId]);

  // Dynamic meta tags – SEO-optimized
  const productType = product?.node?.productType;
  const vendorName = product?.node?.vendor || '';

  const metaTitle = product?.node
    ? `${product.node.title}${productType ? ` ${productType}` : ''}`
    : undefined;

  const metaDescription = product?.node
    ? `${product.node.title} von ${vendorName}${productType ? ` – ${productType}` : ''}. Jetzt bei Horse & Rider Luhmühlen online kaufen.`.slice(0, 155)
    : undefined;

  usePageMeta({
    title: metaTitle,
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

  const allImages = product.node.images.edges;

  // Filter images to show only those matching the selected variant's SKU (via altText)
  const images = (() => {
    if (!selectedVariant || isSingleVariant) return allImages;
    const sku = selectedVariant.sku;
    if (!sku) return allImages;
    const filtered = allImages.filter(img => img.node.altText === sku);
    return filtered.length > 0 ? filtered : allImages;
  })();
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

  const canAddToCart = (!isConfigurator || configState?.isConfigured) && availability.canOrder;

  const productImages = images.map(e => e.node.url);
  const firstVariantSku = variants?.[0]?.node?.sku;
  const selectedSku = selectedVariant?.sku || firstVariantSku;

  return (
    <div className="min-h-screen flex flex-col">
      <ProductJsonLd
        name={product.node.title}
        description={product.node.description}
        handle={product.node.handle}
        images={productImages}
        price={selectedVariant?.price.amount || product.node.priceRange.minVariantPrice.amount}
        currency={selectedVariant?.price.currencyCode || product.node.priceRange.minVariantPrice.currencyCode}
        available={availability.canOrder}
        sku={selectedSku}
        brand={product.node.vendor}
        locale={locale}
      />
      <BreadcrumbJsonLd items={[
        { name: "Start", url: `https://horse-and-rider.de/${locale}` },
        ...(productType ? [{ name: productType, url: `https://horse-and-rider.de/${locale}/search?q=${encodeURIComponent(productType)}` }] : brand ? [{ name: brand.name, url: `https://horse-and-rider.de/${locale}/unsere-marken/${brand.slug}` }] : []),
        { name: product.node.title, url: `https://horse-and-rider.de/${locale}/product/${product.node.handle}` },
      ]} />
      <TopBar /><Header />
      <main className="flex-1" itemScope itemType="https://schema.org/Product">
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
                {Object.keys(selectedOptions).length > 0 ? (
                  <BreadcrumbLink asChild>
                    <button onClick={handleResetToOverview} className="hover:underline cursor-pointer">
                      {product.node.title}
                    </button>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{product.node.title}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square rounded-lg overflow-hidden bg-white mb-3">
                {images[mainImage] ? (
                  <img
                    src={images[mainImage].node.url}
                    alt={images[mainImage].node.altText || product.node.title}
                    width={800}
                    height={800}
                    className="w-full h-full object-contain"
                    itemProp="image"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingCart className="h-16 w-16 text-muted-foreground" /></div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setMainImage(i)} className={`w-16 h-16 sm:w-16 sm:h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-colors snap-start ${i === mainImage ? "border-primary" : "border-transparent"}`}>
                      <img src={img.node.url} alt={img.node.altText || `${product.node.title} Bild ${i + 1}`} width={64} height={64} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              {brand?.logoUrl && (
                <img src={brand.logoUrl} alt={brand.name} className="h-6 w-auto object-contain mb-2" style={{ filter: 'brightness(0)' }} />
              )}
              <h1 className="font-heading text-2xl md:text-3xl font-bold mb-3" itemProp="name">{product.node.title}</h1>
              <div itemProp="offers" itemScope itemType="https://schema.org/Offer">
                <meta itemProp="priceCurrency" content={selectedVariant?.price.currencyCode || product.node.priceRange.minVariantPrice.currencyCode} />
                <meta itemProp="price" content={String(basePrice.toFixed(2))} />
                <link itemProp="availability" href={availability.canOrder ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"} />
                <p className="text-2xl font-bold text-primary mb-4">
                  {isConfigurator && configState?.isConfigured ? (
                    <>{totalPrice.toFixed(2)} € <span className="text-sm font-normal text-muted-foreground">{t("product.incl_config")}</span></>
                  ) : (
                    <>{basePrice.toFixed(2)} €</>
                  )}
                </p>
              </div>
              {product.node.vendor && (
                <p className="text-sm text-muted-foreground mb-1" itemProp="brand" itemScope itemType="https://schema.org/Brand">
                  Marke: <span itemProp="name" className="font-medium text-foreground">{product.node.vendor}</span>
                </p>
              )}
              {selectedSku && (
                <p className="text-sm text-muted-foreground mb-1">
                  Art.-Nr.: <span itemProp="sku" className="font-medium text-foreground">{selectedSku}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-3">
                Verfügbarkeit: <span className={`font-medium ${availability.canOrder ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                  {availability.canOrder ? 'Auf Lager' : 'Nicht verfügbar'}
                </span>
              </p>

              {options.length > 0 && (
                <TooltipProvider delayDuration={200}>
                <div className="mb-6">
                  {options.map((option) => (
                    <div key={option.name} className="mb-3">
                      <label className="text-sm font-medium mb-2 block">
                        {option.name}
                        {selectedOptions[option.name] && <span className="font-normal text-muted-foreground ml-2">– {selectedOptions[option.name]}</span>}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const isSelected = selectedOptions[option.name] === value;
                          const isAvailable = optionAvailability[option.name]?.[value] ?? false;
                          const btn = (
                            <button
                              key={value}
                              onClick={() => handleOptionSelect(option.name, value)}
                              disabled={false}
                              className={`px-3 py-2 sm:py-1.5 text-sm rounded border transition-colors relative min-h-[44px] sm:min-h-0 ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : isAvailable
                                    ? 'border-border hover:border-primary'
                                    : 'border-border text-muted-foreground opacity-50'
                              }`}
                            >
                              {value}
                              {!isAvailable && !isSelected && (
                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="block w-full h-px bg-muted-foreground/40 rotate-[-20deg]" />
                                </span>
                              )}
                            </button>
                          );
                          if (!isAvailable && !isSelected) {
                            return (
                              <Tooltip key={value}>
                                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                                <TooltipContent>Nicht verfügbar</TooltipContent>
                              </Tooltip>
                            );
                          }
                          return btn;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                </TooltipProvider>
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

              {/* Delivery time / availability info */}
              {availability.deliveryTime && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-sm">
                  <Truck className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    Lieferzeit: {availability.deliveryTime}
                  </span>
                </div>
              )}
              {!availability.canOrder && selectedVariant && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-destructive/10 text-sm">
                  <span className="text-destructive font-medium">Dieser Artikel ist derzeit nicht verfügbar.</span>
                </div>
              )}
              {!selectedVariant && options.length > 0 && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-muted text-sm">
                  <span className="text-muted-foreground font-medium">Bitte wählen Sie alle Optionen aus.</span>
                </div>
              )}

              <Button onClick={handleAddToCart} disabled={cartLoading || !canAddToCart || !selectedVariant} className={`w-full ${canAddToCart && selectedVariant ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'}`} size="lg">
                {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                {!selectedVariant ? 'Bitte Variante wählen' : !canAddToCart && isConfigurator && !configState?.isConfigured ? t("product.configure_first") : canAddToCart ? t("product.add_to_cart") : t("product.unavailable")}
              </Button>

              {/* Sticky mobile add-to-cart bar */}
              {selectedVariant && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-3 flex items-center gap-3 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{basePrice.toFixed(2)} €</p>
                    {availability.deliveryTime && <p className="text-xs text-muted-foreground truncate">{availability.deliveryTime}</p>}
                  </div>
                  <Button onClick={handleAddToCart} disabled={cartLoading || !canAddToCart} className={`flex-shrink-0 ${canAddToCart ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground opacity-60'}`} size="default">
                    {cartLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                    {canAddToCart ? t("product.add_to_cart") : t("product.unavailable")}
                  </Button>
                </div>
              )}

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

          {(product.node.descriptionHtml || product.node.description) && (
            <section className="mt-10 pt-8 border-t border-border">
              <h2 className="font-heading text-xl font-semibold mb-4">{t("product.description")}</h2>
              {product.node.descriptionHtml ? (
                <div
                  className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                  itemProp="description"
                  dangerouslySetInnerHTML={{ __html: product.node.descriptionHtml }}
                />
              ) : (
                <div className="text-base text-muted-foreground leading-relaxed" itemProp="description">
                  {product.node.description}
                </div>
              )}
            </section>
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
          <SimilarProducts
            vendor={product.node.vendor}
            productType={product.node.productType}
            currentProductId={product.node.id}
          />

          {/* Bottom spacer for sticky mobile bar */}
          <div className="h-20 md:hidden" />
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
