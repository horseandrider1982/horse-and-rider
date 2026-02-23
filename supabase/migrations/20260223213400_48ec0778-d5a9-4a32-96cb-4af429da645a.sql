
CREATE TABLE public.redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_url text NOT NULL,
  new_url text NOT NULL,
  article_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX redirects_old_url_idx ON public.redirects (old_url);

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on redirects"
  ON public.redirects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read active redirects"
  ON public.redirects FOR SELECT
  USING (is_active = true);

CREATE OR REPLACE FUNCTION public.update_redirects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_redirects_updated_at();
