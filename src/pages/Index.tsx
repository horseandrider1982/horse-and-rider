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

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
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
