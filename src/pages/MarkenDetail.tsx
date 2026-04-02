import { useParams } from "react-router-dom";
import { Loader2, ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { useBrands, useBrandProducts } from "@/hooks/useBrands";
import { usePageMeta } from "@/hooks/usePageMeta";
import { isProductVisibleInListing, type ShopifyProduct } from "@/lib/shopify";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function ProductCard({ product }: { product: ShopifyProduct }) {
  const { locale } = useI18n();
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <LocaleLink to={`/product/${product.node.handle}`} className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group block">
      <div className="aspect-square overflow-hidden bg-white">
        {image ? <img src={image.url} alt={image.altText || product.node.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">🛍️</div>}
      </div>
      <div className="p-4">
        {product.node.vendor && <p className="text-xs text-muted-foreground mb-0.5 truncate uppercase tracking-wider">{product.node.vendor}</p>}
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.node.title}</h3>
        <span className="font-bold text-primary">
          {new Intl.NumberFormat(locale, { style: "currency", currency: price.currencyCode }).format(parseFloat(price.amount))}
        </span>
      </div>
    </LocaleLink>
  );
}

function DefaultSeoText({ brand }: { brand: string }) {
  return (
    <div className="prose prose-sm max-w-none text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">{brand}</h3>
    </div>
  );
}

export default function MarkenDetail() {
  const { t, locale } = useI18n();
  const { slug } = useParams<{ slug: string }>();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const brand = brands?.find((b) => b.slug === slug);
  const vendorName = brand?.name || "";
  const { data: productsData, isLoading: productsLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useBrandProducts(vendorName, !!vendorName);
  const products = useMemo(() => {
    const all = productsData?.pages.flatMap(p => p.products) || [];
    return all.filter(p => isProductVisibleInListing(p.node));
  }, [productsData]);

  const brandMetaDesc = brand
    ? brand.seoText
      ? brand.seoText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 130) + ' – bei Horse & Rider kaufen.'
      : `${brand.name} Reitsport-Produkte günstig online kaufen bei Horse & Rider Luhmühlen. Große Auswahl, schneller Versand.`
    : undefined;

  usePageMeta({
    title: brand?.name,
    description: brandMetaDesc?.slice(0, 160),
    ogImage: brand?.logoUrl || undefined,
    canonicalPath: slug ? `/${locale}/unsere-marken/${slug}` : undefined,
  });

  if (brandsLoading) {
    return <div className="min-h-screen flex flex-col"><TopBar /><Header /><main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main><Footer /></div>;
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex flex-col"><TopBar /><Header />
        <main className="flex-1 container mx-auto px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground mb-4">{t("brands.not_found")}</p>
          <Button asChild variant="outline"><LocaleLink to="/unsere-marken"><ChevronLeft className="h-4 w-4 mr-1" />{t("brands.all_brands")}</LocaleLink></Button>
        </main><Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"><TopBar /><Header />
      <main className="flex-1">
        <section className="bg-card py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Breadcrumbs items={[
                { label: "Home", to: "/" },
                { label: t("brands.title"), to: "/unsere-marken" },
                { label: brand.name },
              ]} className="mb-0" />
            </div>
            <div className="flex items-center gap-5">
              {brand.logoUrl && <img src={brand.logoUrl} alt={`${brand.name} Logo`} className="h-10 w-auto max-w-[140px] object-contain brightness-0" loading="lazy" decoding="async" />}
              <h1 className="font-heading text-3xl md:text-4xl font-bold">{brand.name}</h1>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10">
          <h2 className="font-heading text-xl md:text-2xl font-bold mb-6">{t("brands.products_of").replace("{name}", brand.name)}</h2>
          {productsLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{products.map(p => <ProductCard key={p.node.id} product={p} />)}</div>
                {hasNextPage && (
                  <div className="flex justify-center mt-8">
                    <Button variant="outline" size="lg" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                      {isFetchingNextPage ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("products.loading")}</> : t("products.load_more")}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center">{t("brands.no_products").replace("{name}", brand.name)}</p>
            )}
        </section>

        <section className="container mx-auto px-4 pb-12">
          {brand.seoText ? <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: brand.seoText }} /> : <DefaultSeoText brand={brand.name} />}
        </section>
      </main><Footer />
    </div>
  );
}
