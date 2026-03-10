
-- Knowledge base table for crawled brand website content
CREATE TABLE public.brand_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  source_url text NOT NULL,
  page_title text,
  content text NOT NULL DEFAULT '',
  crawled_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(brand_id, source_url)
);

-- Enable RLS
ALTER TABLE public.brand_knowledge ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public read brand_knowledge"
  ON public.brand_knowledge FOR SELECT TO public
  USING (true);

-- Admins full access
CREATE POLICY "Admins full access on brand_knowledge"
  ON public.brand_knowledge FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'));
