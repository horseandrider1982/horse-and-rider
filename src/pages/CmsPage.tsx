import { useParams, useLocation } from 'react-router-dom';
import { usePublicCmsPage } from '@/hooks/useCmsPages';
import { TopBar } from '@/components/TopBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import NotFound from './NotFound';
import { useI18n } from '@/i18n';
import { usePageMeta } from '@/hooks/usePageMeta';

export default function CmsPage() {
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { locale } = useI18n();
  const slug = paramSlug || location.pathname.replace(/^\/[a-z]{2}\//, '').replace(/^\//, '');
  const { data: page, isLoading, error } = usePublicCmsPage(slug, locale);

  usePageMeta({
    title: page?.seo_title || page?.title,
    description: page?.seo_description || undefined,
    canonicalPath: slug ? `/${locale}/${slug}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar /><Header />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
        <Footer />
      </div>
    );
  }

  if (error || !page) return <NotFound />;

  return (
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
          <h1>{page.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </article>
      </main>
      <Footer />
    </div>
  );
}
