import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
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
