
-- Enums
CREATE TYPE public.cms_editor_mode AS ENUM ('standard', 'ai');
CREATE TYPE public.cms_page_status AS ENUM ('draft', 'active');
CREATE TYPE public.cms_menu_item_type AS ENUM ('cms_page', 'custom_link', 'shopify_menu_placeholder');
CREATE TYPE public.cms_link_target AS ENUM ('_self', '_blank');

-- CMS Pages
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  editor_mode public.cms_editor_mode NOT NULL DEFAULT 'standard',
  seo_title text,
  seo_description text,
  status public.cms_page_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active cms_pages" ON public.cms_pages FOR SELECT USING (status = 'active');
CREATE POLICY "Admins full access on cms_pages" ON public.cms_pages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Auto update updated_at
CREATE OR REPLACE FUNCTION public.update_cms_pages_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.update_cms_pages_updated_at();

-- CMS Menus
CREATE TABLE public.cms_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cms_menus" ON public.cms_menus FOR SELECT USING (true);
CREATE POLICY "Admins full access on cms_menus" ON public.cms_menus FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Seed system menus
INSERT INTO public.cms_menus (key, name) VALUES
  ('top_navigation', 'Top Navigation'),
  ('account_icon_menu', 'Account Icon-Menü'),
  ('information', 'Informationen'),
  ('legal_information', 'Gesetzliche Informationen'),
  ('top_categories', 'Top Kategorien');

-- CMS Menu Items
CREATE TABLE public.cms_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.cms_menus(id) ON DELETE CASCADE,
  type public.cms_menu_item_type NOT NULL,
  label text NOT NULL,
  cms_page_id uuid REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  url text,
  target public.cms_link_target NOT NULL DEFAULT '_self',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active cms_menu_items" ON public.cms_menu_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins full access on cms_menu_items" ON public.cms_menu_items FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Auto update updated_at for menu items
CREATE OR REPLACE FUNCTION public.update_cms_menu_items_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_cms_menu_items_updated_at BEFORE UPDATE ON public.cms_menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_cms_menu_items_updated_at();
