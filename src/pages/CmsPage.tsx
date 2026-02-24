import { useParams } from 'react-router-dom';
import { usePublicCmsPage } from '@/hooks/useCmsPages';
import { TopBar } from '@/components/TopBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Loader2 } from 'lucide-react';
import NotFound from './NotFound';
import { useEffect } from 'react';

export default function CmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: page, isLoading, error } = usePublicCmsPage(slug || '');

  useEffect(() => {
    if (page) {
      document.title = page.seo_title || page.title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && page.seo_description) metaDesc.setAttribute('content', page.seo_description);
    }
  }, [page]);

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
    <div className="min-h-screen flex flex-col">
      <TopBar /><Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-6">{page.title}</h1>
        <div className="prose prose-sm md:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
      </main>
      <Footer />
    </div>
  );
}
