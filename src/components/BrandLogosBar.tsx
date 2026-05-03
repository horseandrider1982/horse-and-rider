import { useFeaturedBrands } from "@/hooks/useFeaturedBrands";
import { LocaleLink } from "./LocaleLink";
import { useI18n } from "@/i18n";
import { resolveBrandLogo } from "@/lib/brandLogos";

export const BrandLogosBar = () => {
  const { data: featured = [], isLoading } = useFeaturedBrands();
  const { t } = useI18n();

  // Always render the section wrapper with a fixed height to prevent CLS
  // when brands load asynchronously and push content below down
  if (isLoading || featured.length === 0) {
    return (
      <section className="py-6 border-b border-border bg-background" style={{ minHeight: '88px' }}>
        <div className="container mx-auto px-4" />
      </section>
    );
  }

  return (
    <section className="py-6 border-b border-border bg-background" style={{ minHeight: '88px' }}>
      <div className="container mx-auto px-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-4">
          {t("brands_bar.title")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {featured.slice(0, 8).map((brand) => (
            <LocaleLink
              key={brand.slug}
              to={`/unsere-marken/${brand.slug}`}
              className="opacity-60 hover:opacity-100 transition-all duration-300"
            >
              <img
                src={resolveBrandLogo(brand.slug, brand.logoUrl)!}
                alt={brand.name}
                loading="lazy"
                decoding="async"
                width={120}
                height={40}
                className="h-8 md:h-10 w-auto max-w-[120px] object-contain brightness-0 grayscale hover:grayscale-0 hover:brightness-100 transition-all duration-300"
              />
            </LocaleLink>
          ))}
        </div>
      </div>
    </section>
  );
};
