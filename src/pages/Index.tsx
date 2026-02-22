import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";

import { ServiceCards } from "@/components/ServiceCards";
import { ProductGrid } from "@/components/ProductGrid";
import { CategoryHighlights } from "@/components/CategoryHighlights";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        
        <ServiceCards />
        <ProductGrid />
        <CategoryHighlights />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
