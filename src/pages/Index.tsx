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
    description: "Ihr kompetenter Partner rund um den Reitsport. Über 20.000 Produkte für Reiter und Pferd – Sättel, Trensen, Reitbekleidung und mehr.",
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
        <ProductGrid />
        <CategoryHighlights />
        <ServiceCards />
        <NewsletterSection />
        <TrustedShopsSection />
        <AboutTeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
