-- Auto-redirect tracking for news_articles slug changes
CREATE OR REPLACE FUNCTION public.track_news_slug_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_canonical_key text;
  v_old_path text;
  v_new_path text;
BEGIN
  IF OLD.slug IS NOT DISTINCT FROM NEW.slug THEN
    RETURN NEW;
  END IF;

  v_canonical_key := 'news:' || NEW.id;
  v_old_path := '/news/' || OLD.slug;
  v_new_path := '/news/' || NEW.slug;

  -- Update entity_paths: mark old as not current
  UPDATE entity_paths SET is_current = false
  WHERE canonical_key = v_canonical_key AND is_current = true;

  -- Insert new path
  INSERT INTO entity_paths (canonical_key, path, is_current, last_seen_at)
  VALUES (v_canonical_key, v_new_path, true, now())
  ON CONFLICT (canonical_key, path) DO UPDATE
    SET is_current = true, last_seen_at = now();

  -- Create redirect from old to new
  INSERT INTO redirects (old_url, new_url, old_path, new_path, entity_type, entity_id, canonical_key, source, is_active, priority)
  VALUES (v_old_path, v_new_path, v_old_path, v_new_path, 'news', NEW.id::text, v_canonical_key, 'auto_url_change', true, 50);

  -- Update public_routes
  INSERT INTO public_routes (entity_type, entity_id, title, current_path, canonical_key, is_public, last_synced_at)
  VALUES ('news', NEW.id::text, NEW.title, v_new_path, v_canonical_key, NEW.status = 'published', now())
  ON CONFLICT (canonical_key) DO UPDATE
    SET current_path = EXCLUDED.current_path, title = EXCLUDED.title,
        is_public = EXCLUDED.is_public, last_synced_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_news_slug_change
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_news_slug_change();

-- Auto-redirect tracking for brands slug changes
CREATE OR REPLACE FUNCTION public.track_brand_slug_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_canonical_key text;
  v_old_path text;
  v_new_path text;
BEGIN
  IF OLD.slug IS NOT DISTINCT FROM NEW.slug THEN
    RETURN NEW;
  END IF;

  v_canonical_key := 'brand:' || NEW.id;
  v_old_path := '/marken/' || OLD.slug;
  v_new_path := '/marken/' || NEW.slug;

  -- Update entity_paths
  UPDATE entity_paths SET is_current = false
  WHERE canonical_key = v_canonical_key AND is_current = true;

  INSERT INTO entity_paths (canonical_key, path, is_current, last_seen_at)
  VALUES (v_canonical_key, v_new_path, true, now())
  ON CONFLICT (canonical_key, path) DO UPDATE
    SET is_current = true, last_seen_at = now();

  -- Create redirect
  INSERT INTO redirects (old_url, new_url, old_path, new_path, entity_type, entity_id, canonical_key, source, is_active, priority)
  VALUES (v_old_path, v_new_path, v_old_path, v_new_path, 'brand', NEW.id::text, v_canonical_key, 'auto_url_change', true, 50);

  -- Update public_routes
  INSERT INTO public_routes (entity_type, entity_id, title, current_path, canonical_key, is_public, last_synced_at)
  VALUES ('brand', NEW.id::text, NEW.name, v_new_path, v_canonical_key, NEW.is_active, now())
  ON CONFLICT (canonical_key) DO UPDATE
    SET current_path = EXCLUDED.current_path, title = EXCLUDED.title,
        is_public = EXCLUDED.is_public, last_synced_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_brand_slug_change
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.track_brand_slug_change();