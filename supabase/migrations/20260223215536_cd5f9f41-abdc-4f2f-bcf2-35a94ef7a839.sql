
-- Enterprise Redirect System: Extended Schema

-- 1. Enums
CREATE TYPE public.redirect_source AS ENUM ('manual', 'import_csv', 'auto_url_change', 'migration_seed', 'system_collapse');
CREATE TYPE public.redirect_entity_type AS ENUM ('product', 'collection', 'page', 'brand', 'news', 'custom');
CREATE TYPE public.issue_type AS ENUM ('loop_detected', 'chain_detected', 'duplicate_old_path', 'missing_target', 'import_sku_not_found', 'import_old_path_conflict');
CREATE TYPE public.issue_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE public.issue_status AS ENUM ('open', 'resolved', 'ignored');

-- 2. Extend existing redirects table with enterprise columns
ALTER TABLE public.redirects
  ADD COLUMN IF NOT EXISTS source redirect_source DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS canonical_key text,
  ADD COLUMN IF NOT EXISTS entity_type redirect_entity_type,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS sku text;

-- Rename columns for clarity (old_url -> old_path, new_url -> new_path internally but keep backwards compat)
-- We keep old_url/new_url column names to avoid breaking existing code, but add normalized columns
ALTER TABLE public.redirects
  ADD COLUMN IF NOT EXISTS old_path text,
  ADD COLUMN IF NOT EXISTS new_path text;

-- 3. entity_paths (URL history per entity)
CREATE TABLE public.entity_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key text NOT NULL,
  path text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  UNIQUE(canonical_key, path)
);
CREATE INDEX idx_entity_paths_path ON public.entity_paths(path);
CREATE INDEX idx_entity_paths_canonical ON public.entity_paths(canonical_key);
ALTER TABLE public.entity_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on entity_paths" ON public.entity_paths FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public read entity_paths" ON public.entity_paths FOR SELECT USING (true);

-- 4. redirect_edges (for chain analysis)
CREATE TABLE public.redirect_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL,
  to_path text NOT NULL,
  redirect_id uuid REFERENCES public.redirects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_redirect_edges_from ON public.redirect_edges(from_path);
CREATE INDEX idx_redirect_edges_to ON public.redirect_edges(to_path);
ALTER TABLE public.redirect_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on redirect_edges" ON public.redirect_edges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public read redirect_edges" ON public.redirect_edges FOR SELECT USING (true);

-- 5. redirect_issues (conflicts & errors)
CREATE TABLE public.redirect_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type issue_type NOT NULL,
  severity issue_severity NOT NULL DEFAULT 'warning',
  payload jsonb DEFAULT '{}',
  status issue_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX idx_redirect_issues_status ON public.redirect_issues(status);
ALTER TABLE public.redirect_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on redirect_issues" ON public.redirect_issues FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. redirect_hits (daily aggregates)
CREATE TABLE public.redirect_hits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  redirect_id uuid REFERENCES public.redirects(id) ON DELETE CASCADE,
  old_path text NOT NULL,
  new_path text NOT NULL,
  day date NOT NULL DEFAULT CURRENT_DATE,
  hits integer NOT NULL DEFAULT 1,
  UNIQUE(redirect_id, day)
);
CREATE INDEX idx_redirect_hits_day ON public.redirect_hits(day);
ALTER TABLE public.redirect_hits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on redirect_hits" ON public.redirect_hits FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public insert redirect_hits" ON public.redirect_hits FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update redirect_hits" ON public.redirect_hits FOR UPDATE USING (true);

-- 7. URL normalization function
CREATE OR REPLACE FUNCTION public.normalize_url(input text)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  result := input;
  -- Extract path only (remove domain if present)
  IF result ~ '^https?://' THEN
    result := regexp_replace(result, '^https?://[^/]+', '');
  END IF;
  -- Remove query string
  result := split_part(result, '?', 1);
  -- Remove fragment
  result := split_part(result, '#', 1);
  -- Lowercase
  result := lower(result);
  -- Reduce multiple slashes
  result := regexp_replace(result, '/+', '/', 'g');
  -- Remove trailing slash (except root)
  IF length(result) > 1 THEN
    result := rtrim(result, '/');
  END IF;
  -- Ensure leading slash
  IF left(result, 1) != '/' THEN
    result := '/' || result;
  END IF;
  RETURN result;
END;
$$;

-- 8. Populate old_path/new_path from existing data
UPDATE public.redirects SET
  old_path = normalize_url(old_url),
  new_path = normalize_url(new_url)
WHERE old_path IS NULL OR new_path IS NULL;

-- 9. Chain collapse function
CREATE OR REPLACE FUNCTION public.collapse_redirect_chains()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed integer := 0;
  r record;
  target text;
  hops integer;
  visited text[];
BEGIN
  FOR r IN SELECT id, old_path, new_path FROM redirects WHERE is_active = true AND old_path IS NOT NULL AND new_path IS NOT NULL
  LOOP
    target := r.new_path;
    hops := 0;
    visited := ARRAY[r.old_path];
    
    LOOP
      SELECT new_path INTO target
      FROM redirects
      WHERE old_path = target AND is_active = true AND id != r.id;
      
      IF NOT FOUND OR target IS NULL THEN EXIT; END IF;
      
      hops := hops + 1;
      
      -- Loop detection
      IF target = ANY(visited) THEN
        INSERT INTO redirect_issues (type, severity, payload)
        VALUES ('loop_detected', 'critical', jsonb_build_object(
          'redirect_id', r.id, 'chain', visited || target
        ));
        UPDATE redirects SET is_active = false WHERE id = r.id;
        EXIT;
      END IF;
      
      visited := visited || target;
      
      -- Max hops failsafe
      IF hops >= 5 THEN
        INSERT INTO redirect_issues (type, severity, payload)
        VALUES ('chain_detected', 'warning', jsonb_build_object(
          'redirect_id', r.id, 'chain', visited, 'hops', hops
        ));
        EXIT;
      END IF;
    END LOOP;
    
    -- Collapse: update to final target if chain was found
    IF hops > 0 AND target IS NOT NULL AND target != r.new_path AND NOT (target = ANY(ARRAY[r.old_path])) THEN
      UPDATE redirects SET new_path = target, new_url = target, source = 'system_collapse' WHERE id = r.id;
      changed := changed + 1;
    END IF;
  END LOOP;
  
  RETURN changed;
END;
$$;

-- 10. Loop check function (used before insert/update)
CREATE OR REPLACE FUNCTION public.check_redirect_loop(p_old_path text, p_new_path text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_path text;
  hops integer := 0;
  visited text[];
BEGIN
  IF p_old_path = p_new_path THEN RETURN true; END IF;
  
  current_path := p_new_path;
  visited := ARRAY[p_old_path];
  
  LOOP
    SELECT new_path INTO current_path
    FROM redirects
    WHERE old_path = current_path AND is_active = true;
    
    IF NOT FOUND OR current_path IS NULL THEN RETURN false; END IF;
    
    IF current_path = ANY(visited) THEN RETURN true; END IF;
    
    visited := visited || current_path;
    hops := hops + 1;
    
    IF hops >= 10 THEN RETURN true; END IF;
  END LOOP;
END;
$$;

-- 11. Trigger to sync old_path/new_path on insert/update
CREATE OR REPLACE FUNCTION public.sync_redirect_paths()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.old_path := normalize_url(COALESCE(NEW.old_url, ''));
  NEW.new_path := normalize_url(COALESCE(NEW.new_url, ''));
  
  -- Sync edge table
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

CREATE TRIGGER trg_sync_redirect_paths
  BEFORE INSERT OR UPDATE ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION sync_redirect_paths();

-- 12. Add indexes
CREATE INDEX IF NOT EXISTS idx_redirects_old_path ON public.redirects(old_path);
CREATE INDEX IF NOT EXISTS idx_redirects_sku ON public.redirects(sku);
CREATE INDEX IF NOT EXISTS idx_redirects_source ON public.redirects(source);
CREATE INDEX IF NOT EXISTS idx_redirects_canonical ON public.redirects(canonical_key);
