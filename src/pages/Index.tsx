import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { LocaleLink } from "@/components/LocaleLink";
import { Gift } from "lucide-react";
import { HeroBanner } from "@/components/HeroBanner";
import { BrandLogosBar } from "@/components/BrandLogosBar";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryHighlights } from "@/components/CategoryHighlights";
import { ServiceCards } from "@/components/ServiceCards";
import { NewsletterSection } from "@/components/NewsletterSection";
import { TrustedShopsSection } from "@/components/TrustedShopsSection";
import { AboutTeamSection } from "@/components/AboutTeamSection";
import { Footer } from "@/components/Footer";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/JsonLd";
import { BackToTop } from "@/components/BackToTop";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/i18n";

const Index = () => {
  const { locale } = useI18n();
  usePageMeta({
    title: "Reitsport Online Shop",
    description: "Eventing Equipment & Reitsportausrüstung online kaufen ✓ Hochwertige Marken für Vielseitigkeit, Jagdreiten & Training ✓ Schneller Versand & Top-Service bei Horse & Rider Luhmühlen",
    canonicalPath: `/${locale}`,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <TopBar />
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <BrandLogosBar />
        <ServiceCards />
        <div className="container mx-auto px-4 -mt-4 mb-8">
          <LocaleLink
            to="/product/GUTSCHEIN-5"
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4 text-center text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Gift className="h-5 w-5" />
            Geschenkgutschein
          </LocaleLink>
        </div>
        <ProductGrid />
        <CategoryHighlights />
        <NewsletterSection />
        <TrustedShopsSection />
        <AboutTeamSection />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
