
CREATE TABLE IF NOT EXISTS public.ui_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  auto_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(locale, key)
);

ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ui_translations" ON public.ui_translations
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins full access on ui_translations" ON public.ui_translations
  FOR ALL TO public USING (public.has_role(auth.uid(), 'admin'::public.app_role));
