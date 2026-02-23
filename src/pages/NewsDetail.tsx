import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useArticleBySlug, useArticleProducts, CATEGORY_LABELS, usePublishedArticles } from '@/hooks/useNewsArticles';
import { useProducts } from '@/hooks/useProducts';
import { useCartStore } from '@/stores/cartStore';
import type { ShopifyProduct } from '@/lib/shopify';

function RelatedProducts({ handles }: { handles: string[] }) {
  // Fetch all products and filter by handles
  const { data: allProducts } = useProducts(50);

  const products = (allProducts || []).filter(p => handles.includes(p.node.handle));

  if (products.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-heading font-bold text-foreground mb-6">Passende Produkte</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(product => (
          <ProductCard key={product.node.handle} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: ShopifyProduct }) {
  const img = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;
  const addItem = useCartStore(s => s.addItem);
  const variant = product.node.variants.edges[0]?.node;

  const handleAdd = () => {
    if (!variant) return;
    addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions,
    });
  };

  return (
    <div className="group">
      <Link to={`/product/${product.node.handle}`} className="block">
        {img ? (
          <img src={img.url} alt={img.altText || product.node.title} className="w-full aspect-square object-cover rounded-lg mb-2 group-hover:opacity-90 transition-opacity" loading="lazy" />
        ) : (
          <div className="w-full aspect-square bg-muted rounded-lg mb-2" />
        )}
        <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{product.node.title}</h3>
      </Link>
      <p className="text-sm text-muted-foreground mb-2">
        {parseFloat(price.amount).toLocaleString('de-DE', { style: 'currency', currency: price.currencyCode })}
      </p>
      <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleAdd}>
        In den Warenkorb
      </Button>
    </div>
  );
}

function MoreNews({ currentSlug, category }: { currentSlug: string; category: string }) {
  const { data } = usePublishedArticles({ category: category as any, perPage: 4 });
  const articles = (data?.articles || []).filter(a => a.slug !== currentSlug).slice(0, 3);

  if (articles.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-xl font-heading font-bold text-foreground mb-6">Weitere News</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {articles.map(a => (
          <Link key={a.id} to={`/news/${a.slug}`} className="group">
            {a.cover_image_url ? (
              <img src={a.cover_image_url} alt={a.cover_image_alt || a.title} className="w-full h-40 object-cover rounded-lg mb-3 group-hover:opacity-90 transition-opacity" loading="lazy" />
            ) : (
              <div className="w-full h-40 bg-muted rounded-lg mb-3" />
            )}
            <h3 className="font-medium group-hover:text-primary transition-colors line-clamp-2">{a.title}</h3>
            {a.published_at && (
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.published_at).toLocaleDateString('de-DE')}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function NewsDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, error } = useArticleBySlug(slug || '');
  const { data: articleProducts } = useArticleProducts(article?.id || '');

  // Set document title for SEO
  useEffect(() => {
    if (article) {
      document.title = `${article.seo_title || article.title} – Horse & Rider`;
    }
    return () => { document.title = 'Horse & Rider'; };
  }, [article]);

  const relatedHandles = (articleProducts || []).map(p => p.shopify_handle);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Artikel nicht gefunden</h1>
          <Button asChild><Link to="/news"><ArrowLeft className="h-4 w-4 mr-1.5" />Zur Übersicht</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Cover image */}
        {article.cover_image_url && (
          <div className="w-full max-h-[400px] overflow-hidden">
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt || article.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <article className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
          {/* Back */}
          <Button variant="ghost" size="sm" asChild className="mb-6">
            <Link to="/news"><ArrowLeft className="h-4 w-4 mr-1.5" />Alle News</Link>
          </Button>

          {/* Meta */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>{CATEGORY_LABELS[article.category]}</span>
            {article.published_at && (
              <>
                <span>·</span>
                <time>{new Date(article.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</time>
              </>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-8">{article.title}</h1>

          {/* Content */}
          <div
            className="prose prose-sm md:prose-base max-w-none prose-headings:font-heading prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Related Products */}
          {relatedHandles.length > 0 && <RelatedProducts handles={relatedHandles} />}

          {/* More News */}
          <MoreNews currentSlug={article.slug} category={article.category} />
        </article>
      </main>
      <Footer />
    </div>
  );
}
