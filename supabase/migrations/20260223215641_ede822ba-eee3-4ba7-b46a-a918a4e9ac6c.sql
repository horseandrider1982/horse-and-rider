
-- Fix security warnings: set search_path on functions
CREATE OR REPLACE FUNCTION public.normalize_url(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  result := input;
  IF result ~ '^https?://' THEN
    result := regexp_replace(result, '^https?://[^/]+', '');
  END IF;
  result := split_part(result, '?', 1);
  result := split_part(result, '#', 1);
  result := lower(result);
  result := regexp_replace(result, '/+', '/', 'g');
  IF length(result) > 1 THEN
    result := rtrim(result, '/');
  END IF;
  IF left(result, 1) != '/' THEN
    result := '/' || result;
  END IF;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_redirect_paths()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.old_path := normalize_url(COALESCE(NEW.old_url, ''));
  NEW.new_path := normalize_url(COALESCE(NEW.new_url, ''));
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM redirect_edges WHERE redirect_id = NEW.id;
  END IF;
  IF NEW.old_path != '' AND NEW.new_path != '' THEN
    INSERT INTO redirect_edges (from_path, to_path, redirect_id)
    VALUES (NEW.old_path, NEW.new_path, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix permissive RLS on redirect_hits: restrict to anon for hit tracking
DROP POLICY IF EXISTS "Public insert redirect_hits" ON public.redirect_hits;
DROP POLICY IF EXISTS "Public update redirect_hits" ON public.redirect_hits;
