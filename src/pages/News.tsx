import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  usePublishedArticles, useAvailableMonths,
  CATEGORY_LABELS, type NewsCategory,
} from '@/hooks/useNewsArticles';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'oldest', label: 'Älteste zuerst' },
  { value: 'title_asc', label: 'Titel A–Z' },
  { value: 'title_desc', label: 'Titel Z–A' },
] as const;

const MONTH_LABELS: Record<string, string> = {};
function formatMonth(ym: string): string {
  if (MONTH_LABELS[ym]) return MONTH_LABELS[ym];
  const [y, m] = ym.split('-');
  const d = new Date(+y, +m - 1);
  const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  MONTH_LABELS[ym] = label;
  return label;
}

export default function News() {
  const [sort, setSort] = useState<string>('newest');
  const [category, setCategory] = useState<string>('all');
  const [month, setMonth] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading } = usePublishedArticles({
    category: category !== 'all' ? (category as NewsCategory) : undefined,
    month: month !== 'all' ? month : undefined,
    sort: sort as any,
    page,
    perPage,
  });

  const { data: months } = useAvailableMonths();
  const totalPages = Math.ceil((data?.total || 0) / perPage);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="bg-muted/40 py-10 md:py-14">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">News & Aktuelles</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">Neuigkeiten rund um Horse & Rider, Produkte und Events.</p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:py-12">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Select value={sort} onValueChange={v => { setSort(v); setPage(1); }}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={v => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Kategorien</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={v => { setMonth(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Monate</SelectItem>
                {(months || []).map(m => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Articles */}
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : !data?.articles.length ? (
            <p className="text-center py-16 text-muted-foreground">Keine Artikel gefunden.</p>
          ) : (
            <div className="space-y-8">
              {data.articles.map(article => (
                <article key={article.id} className="grid md:grid-cols-3 gap-5 border-b border-border pb-8 last:border-b-0">
                  {/* Image */}
                  <div className="md:col-span-1">
                    <Link to={`/news/${article.slug}`} className="block overflow-hidden rounded-lg">
                      {article.cover_image_url ? (
                        <img
                          src={article.cover_image_url}
                          alt={article.cover_image_alt || article.title}
                          className="w-full h-48 md:h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-48 md:h-full bg-muted flex items-center justify-center rounded-lg">
                          <span className="text-muted-foreground text-sm">Kein Bild</span>
                        </div>
                      )}
                    </Link>
                  </div>
                  {/* Content */}
                  <div className="md:col-span-2 flex flex-col justify-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{CATEGORY_LABELS[article.category]}</span>
                      {article.published_at && (
                        <>
                          <span>·</span>
                          <time>{new Date(article.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</time>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">
                      <Link to={`/news/${article.slug}`} className="hover:text-primary transition-colors">
                        {article.title}
                      </Link>
                    </h2>
                    {article.excerpt && (
                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{article.excerpt}</p>
                    )}
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/news/${article.slug}`}>
                          Weiter <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">Seite {page} von {totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
