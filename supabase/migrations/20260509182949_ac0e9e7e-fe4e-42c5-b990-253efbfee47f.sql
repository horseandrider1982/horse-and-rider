
CREATE TABLE public.not_found_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_not_found_log_created_at ON public.not_found_log(created_at DESC);
CREATE INDEX idx_not_found_log_path ON public.not_found_log(path);

ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read not_found_log"
ON public.not_found_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public insert not_found_log"
ON public.not_found_log FOR INSERT
WITH CHECK (true);

CREATE TABLE public.monitor_404_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_alert_at timestamp with time zone,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.monitor_404_state (id) VALUES (1);

ALTER TABLE public.monitor_404_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage monitor_404_state"
ON public.monitor_404_state FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
