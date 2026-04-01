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
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import ResetPassword from "./pages/ResetPassword";
import Search from "./pages/Search";
import RedirectMonitoring from "./pages/admin/RedirectMonitoring";
import RedirectConflicts from "./pages/admin/RedirectConflicts";
import UnsereMarken from "./pages/UnsereMarken";
import MarkenDetail from "./pages/MarkenDetail";
import Kontakt from "./pages/Kontakt";
import FAQ from "./pages/FAQ";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import NotFound from "./pages/NotFound";
import CmsPage from "./pages/CmsPage";
import CollectionDetail from "./pages/CollectionDetail";
import ThankYou from "./pages/ThankYou";
import { CookieBanner } from "./components/CookieBanner";

const queryClient = new QueryClient();

const AppContent = () => {
  useCartSync();
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RedirectGuard />
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
      <CookieBanner />
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
