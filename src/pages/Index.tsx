import { lazy, Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { HeroBanner } from "@/components/HeroBanner";
import { BrandLogosBar } from "@/components/BrandLogosBar";
import { ProductGrid } from "@/components/ProductGrid";
import { ServiceCards } from "@/components/ServiceCards";
import { OrganizationJsonLd, WebSiteJsonLd, LocalBusinessJsonLd } from "@/components/JsonLd";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/i18n";

// Below-the-fold: lazy-load to shrink initial bundle (Footer ~95KB, Newsletter, TrustedShops, AboutTeam)
const CategoryHighlights = lazy(() => import("@/components/CategoryHighlights").then(m => ({ default: m.CategoryHighlights })));
const NewsletterSection = lazy(() => import("@/components/NewsletterSection").then(m => ({ default: m.NewsletterSection })));
const TrustedShopsSection = lazy(() => import("@/components/TrustedShopsSection").then(m => ({ default: m.TrustedShopsSection })));
const AboutTeamSection = lazy(() => import("@/components/AboutTeamSection").then(m => ({ default: m.AboutTeamSection })));
const RecentlyViewed = lazy(() => import("@/components/RecentlyViewed").then(m => ({ default: m.RecentlyViewed })));
const Footer = lazy(() => import("@/components/Footer").then(m => ({ default: m.Footer })));
const BackToTop = lazy(() => import("@/components/BackToTop").then(m => ({ default: m.BackToTop })));

const Index = () => {
  const { locale } = useI18n();
  usePageMeta({
    title: "Reitsport Online Shop",
    description: "Eventing Equipment & Reitsportausrüstung online kaufen ✓ Top-Marken, Fachberatung & schneller Versand bei Horse & Rider Luhmühlen",
    canonicalPath: `/${locale}`,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <OrganizationJsonLd />
      <LocalBusinessJsonLd />
      <WebSiteJsonLd />
      <TopBar />
      <Header />
      <main className="flex-1">
        <HeroBanner />
        <BrandLogosBar />
        <ServiceCards />
        <ProductGrid />
        <Suspense fallback={null}>
          <RecentlyViewed />
        </Suspense>
        <Suspense fallback={<div style={{ minHeight: 300 }} />}>
          <CategoryHighlights />
        </Suspense>
        <Suspense fallback={<div style={{ minHeight: 200 }} />}>
          <NewsletterSection />
        </Suspense>
        <Suspense fallback={<div style={{ minHeight: 250 }} />}>
          <TrustedShopsSection />
        </Suspense>
        <Suspense fallback={<div style={{ minHeight: 400 }} />}>
          <AboutTeamSection />
        </Suspense>
      </main>
      <Suspense fallback={<div style={{ minHeight: 500 }} />}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <BackToTop />
      </Suspense>
    </div>
  );
};

export default Index;
