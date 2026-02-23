import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type NewsCategory = 'horse_rider_news' | 'produktnews' | 'events';
export type NewsStatus = 'draft' | 'published';

export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category: NewsCategory;
  status: NewsStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticleProduct {
  id: string;
  article_id: string;
  shopify_handle: string;
  sort_order: number;
}

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  horse_rider_news: 'Horse & Rider News',
  produktnews: 'Produktnews',
  events: 'Events',
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateExcerpt(html: string, maxLength = 180): string {
  const text = html.replace(/<[^>]*>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

// ---- Public hooks ----

export function usePublishedArticles(options?: {
  category?: NewsCategory;
  month?: string; // "YYYY-MM"
  sort?: 'newest' | 'oldest' | 'title_asc' | 'title_desc';
  page?: number;
  perPage?: number;
}) {
  const { category, month, sort = 'newest', page = 1, perPage = 10 } = options || {};

  return useQuery({
    queryKey: ['news-published', category, month, sort, page, perPage],
    queryFn: async () => {
      let query = supabase
        .from('news_articles')
        .select('*', { count: 'exact' })
        .eq('status', 'published');

      if (category) query = query.eq('category', category);

      if (month) {
        const start = `${month}-01T00:00:00Z`;
        const [y, m] = month.split('-').map(Number);
        const end = new Date(y, m, 1).toISOString();
        query = query.gte('published_at', start).lt('published_at', end);
      }

      switch (sort) {
        case 'oldest': query = query.order('published_at', { ascending: true }); break;
        case 'title_asc': query = query.order('title', { ascending: true }); break;
        case 'title_desc': query = query.order('title', { ascending: false }); break;
        default: query = query.order('published_at', { ascending: false });
      }

      const from = (page - 1) * perPage;
      query = query.range(from, from + perPage - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { articles: (data || []) as NewsArticle[], total: count || 0 };
    },
  });
}

export function useArticleBySlug(slug: string) {
  return useQuery({
    queryKey: ['news-article', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data as NewsArticle;
    },
    enabled: !!slug,
  });
}

export function useArticleProducts(articleId: string) {
  return useQuery({
    queryKey: ['news-article-products', articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_article_products')
        .select('*')
        .eq('article_id', articleId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as NewsArticleProduct[];
    },
    enabled: !!articleId,
  });
}

export function useAvailableMonths() {
  return useQuery({
    queryKey: ['news-available-months'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('published_at')
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false });
      if (error) throw error;
      const months = new Set<string>();
      (data || []).forEach((a) => {
        if (a.published_at) {
          const d = new Date(a.published_at);
          months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      });
      return Array.from(months);
    },
  });
}

// ---- Admin hooks ----

export function useAdminArticles() {
  return useQuery({
    queryKey: ['admin-news-articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NewsArticle[];
    },
  });
}

export function useAdminArticle(id: string) {
  return useQuery({
    queryKey: ['admin-news-article', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as NewsArticle;
    },
    enabled: !!id,
  });
}

export function useAdminArticleProducts(articleId: string) {
  return useQuery({
    queryKey: ['admin-article-products', articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_article_products')
        .select('*')
        .eq('article_id', articleId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as NewsArticleProduct[];
    },
    enabled: !!articleId,
  });
}

export function useSaveArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      cover_image_url: string | null;
      cover_image_alt: string | null;
      category: NewsCategory;
      status: NewsStatus;
      published_at: string | null;
      seo_title: string | null;
      seo_description: string | null;
      relatedHandles: string[];
    }) => {
      const { relatedHandles, id, ...articleData } = input;

      // Auto-generate excerpt if empty
      if (!articleData.excerpt && articleData.content) {
        articleData.excerpt = generateExcerpt(articleData.content);
      }

      // Auto-generate slug if empty
      if (!articleData.slug && articleData.title) {
        articleData.slug = generateSlug(articleData.title);
      }

      // Set published_at when publishing
      if (articleData.status === 'published' && !articleData.published_at) {
        articleData.published_at = new Date().toISOString();
      }

      let articleId = id;

      if (articleId) {
        const { error } = await supabase
          .from('news_articles')
          .update(articleData)
          .eq('id', articleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('news_articles')
          .insert(articleData)
          .select('id')
          .single();
        if (error) throw error;
        articleId = data.id;
      }

      // Sync related products
      await supabase.from('news_article_products').delete().eq('article_id', articleId);
      if (relatedHandles.length > 0) {
        const rows = relatedHandles.map((handle, i) => ({
          article_id: articleId!,
          shopify_handle: handle,
          sort_order: i,
        }));
        const { error } = await supabase.from('news_article_products').insert(rows);
        if (error) throw error;
      }

      return articleId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-news-articles'] });
      qc.invalidateQueries({ queryKey: ['news-published'] });
    },
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('news_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-news-articles'] });
      qc.invalidateQueries({ queryKey: ['news-published'] });
    },
  });
}

export { generateSlug, generateExcerpt };
