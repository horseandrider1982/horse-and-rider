import heroImage from "@/assets/hero-equestrian.jpg";
import { useI18n } from "@/i18n";

export const HeroSection = () => {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Horse & Rider - Reitsport"
          width={1600}
          height={600}
          fetchPriority="high"
          decoding="async"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
      </div>
      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-xl">
          <h1 className="font-heading text-3xl md:text-5xl font-bold text-background leading-tight mb-4">{t("hero_section.title")}</h1>
          <p className="text-background/90 text-lg mb-6 font-light">{t("hero_section.subtitle")}</p>
          <div className="flex gap-3">
            <a href="#produkte" className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-opacity">{t("hero_section.cta_shop")}</a>
            <a href="tel:+4941726403" className="inline-flex items-center px-6 py-3 border-2 border-background/80 text-background font-semibold rounded hover:bg-background/10 transition-colors">{t("hero_section.cta_phone")}</a>
          </div>
        </div>
      </div>
    </section>
  );
};
