
CREATE TABLE public.redirect_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku text NOT NULL,
  old_slug text NOT NULL,
  resolved_handle text,
  resolved_title text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  redirected_at timestamp with time zone
);

CREATE INDEX idx_redirect_staging_status ON public.redirect_staging (status);
CREATE INDEX idx_redirect_staging_sku ON public.redirect_staging (sku);

ALTER TABLE public.redirect_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on redirect_staging"
  ON public.redirect_staging FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
