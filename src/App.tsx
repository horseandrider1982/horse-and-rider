import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCartSync } from "@/hooks/useCartSync";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RedirectGuard } from "@/components/RedirectGuard";
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
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import Widerrufsrecht from "./pages/Widerrufsrecht";
import Kontakt from "./pages/Kontakt";
import Versand from "./pages/Versand";
import FAQ from "./pages/FAQ";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import NotFound from "./pages/NotFound";
import CmsPage from "./pages/CmsPage";
import { CookieBanner } from "./components/CookieBanner";

const queryClient = new QueryClient();

const AppContent = () => {
  useCartSync();
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RedirectGuard />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/product/:handle" element={<ProductDetail />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/301/monitoring" element={<RedirectMonitoring />} />
        <Route path="/admin/301/conflicts" element={<RedirectConflicts />} />
        <Route path="/search" element={<Search />} />
        <Route path="/unsere-marken" element={<UnsereMarken />} />
        <Route path="/unsere-marken/:slug" element={<MarkenDetail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="/agb" element={<AGB />} />
        <Route path="/widerrufsrecht" element={<Widerrufsrecht />} />
        <Route path="/kontakt" element={<Kontakt />} />
        <Route path="/versand" element={<Versand />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/pages/:slug" element={<CmsPage />} />
        <Route path="*" element={<NotFound />} />
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
