
-- News status enum
CREATE TYPE public.news_status AS ENUM ('draft', 'published');

-- News category enum
CREATE TYPE public.news_category AS ENUM ('horse_rider_news', 'produktnews', 'events');

-- Main news articles table
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  cover_image_alt TEXT,
  category news_category NOT NULL DEFAULT 'horse_rider_news',
  status news_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Junction table for related Shopify products
CREATE TABLE public.news_article_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  shopify_handle TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(article_id, shopify_handle)
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_article_products ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Public read published articles" ON public.news_articles
  FOR SELECT USING (status = 'published');

-- Admins full access on news_articles
CREATE POLICY "Admins full access on news_articles" ON public.news_articles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Public can read related products of published articles
CREATE POLICY "Public read article products" ON public.news_article_products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.news_articles WHERE id = article_id AND status = 'published')
  );

-- Admins full access on news_article_products
CREATE POLICY "Admins full access on news_article_products" ON public.news_article_products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_news_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_news_updated_at();
