import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useCartSync } from "@/hooks/useCartSync";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RedirectGuard } from "@/components/RedirectGuard";
import { I18nLayout, DEFAULT_LOCALE } from "@/i18n";
import { HreflangTags } from "@/components/HreflangTags";
import { ShopifyCustomerProvider } from "@/lib/auth/ShopifyCustomerContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Lazy-loaded pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Search = lazy(() => import("./pages/Search"));
const RedirectMonitoring = lazy(() => import("./pages/admin/RedirectMonitoring"));
const RedirectConflicts = lazy(() => import("./pages/admin/RedirectConflicts"));
const UnsereMarken = lazy(() => import("./pages/UnsereMarken"));
const MarkenDetail = lazy(() => import("./pages/MarkenDetail"));
const Kontakt = lazy(() => import("./pages/Kontakt"));
const FAQ = lazy(() => import("./pages/FAQ"));
const News = lazy(() => import("./pages/News"));
const NewsDetail = lazy(() => import("./pages/NewsDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CmsPage = lazy(() => import("./pages/CmsPage"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const ShopifyCallback = lazy(() => import("./pages/ShopifyCallback"));
const ShopifyLogin = lazy(() => import("./pages/ShopifyLogin"));
const CookieBanner = lazy(() => import("./components/CookieBanner").then(m => ({ default: m.CookieBanner })));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AppContent = () => {
  useCartSync();
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <RedirectGuard />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root → redirect to default locale */}
        <Route path="/" element={<Navigate to={`/${DEFAULT_LOCALE}`} replace />} />

        {/* Admin routes (no locale prefix) */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/301/monitoring" element={<RedirectMonitoring />} />
        <Route path="/admin/301/conflicts" element={<RedirectConflicts />} />

        {/* All public routes with /:locale/ prefix */}
        <Route path="/:locale" element={<><I18nLayout /><HreflangTags /></>}>
          <Route index element={<Index />} />
          <Route path="product/:handle" element={<ProductDetail />} />
          <Route path="danke" element={<ThankYou />} />
          <Route path="thank-you" element={<ThankYou />} />
          <Route path="collections/:handle" element={<CollectionDetail />} />
          <Route path="auth" element={<Auth />} />
          <Route path="account" element={<Account />} />
          <Route path="search" element={<Search />} />
          <Route path="unsere-marken" element={<UnsereMarken />} />
          <Route path="unsere-marken/:slug" element={<MarkenDetail />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="news" element={<News />} />
          <Route path="news/:slug" element={<NewsDetail />} />
          <Route path="impressum" element={<CmsPage />} />
          <Route path="datenschutz" element={<CmsPage />} />
          <Route path="agb" element={<CmsPage />} />
          <Route path="widerrufsrecht" element={<CmsPage />} />
          <Route path="kontakt" element={<Kontakt />} />
          <Route path="versand" element={<CmsPage />} />
          <Route path="service" element={<CmsPage />} />
          <Route path="stickerei" element={<CmsPage />} />
          <Route path="scherblaetter-schleifservice" element={<CmsPage />} />
          <Route path="deckenwasche" element={<CmsPage />} />
          <Route path="test-vor-kauf" element={<CmsPage />} />
          <Route path="gravur" element={<CmsPage />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="pages/:slug" element={<CmsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <CookieBanner />
      </Suspense>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
