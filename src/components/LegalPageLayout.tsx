import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface LegalPageLayoutProps {
  children: React.ReactNode;
}

export const LegalPageLayout = ({ children }: LegalPageLayoutProps) => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
      <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none
        prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground
        prose-a:text-primary hover:prose-a:text-primary/80
        prose-li:text-foreground/90">
        {children}
      </article>
    </main>
    <Footer />
  </div>
);
