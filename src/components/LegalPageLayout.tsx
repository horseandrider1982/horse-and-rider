import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface LegalPageLayoutProps {
  children: React.ReactNode;
}

export const LegalPageLayout = ({ children }: LegalPageLayoutProps) => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-3xl font-sans">
      <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none
        prose-headings:text-foreground prose-headings:font-semibold
        prose-h1:text-2xl prose-h1:md:text-3xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border
        prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-lg prose-h3:md:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
        prose-strong:text-foreground
        prose-a:text-primary hover:prose-a:text-primary/80 prose-a:underline-offset-2
        prose-li:text-foreground/90 prose-li:leading-relaxed prose-li:my-1
        prose-ul:my-4 prose-ul:pl-5
        prose-hr:my-8 prose-hr:border-border">
        {children}
      </article>
    </main>
    <Footer />
  </div>
);
