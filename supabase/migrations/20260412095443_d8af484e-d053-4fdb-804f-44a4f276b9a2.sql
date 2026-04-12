
CREATE TABLE public.search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  is_natural_language boolean NOT NULL DEFAULT false,
  searched_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_logs_searched_at ON public.search_logs (searched_at DESC);
CREATE INDEX idx_search_logs_query ON public.search_logs (lower(query));

ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- Edge function inserts via service role, so no public INSERT policy needed
CREATE POLICY "Admins full access on search_logs"
  ON public.search_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-cleanup: delete logs older than 90 days (can be run manually or via cron)
