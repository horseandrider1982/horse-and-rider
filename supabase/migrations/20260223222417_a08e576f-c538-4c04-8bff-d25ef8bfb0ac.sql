-- Add created_by to redirects
ALTER TABLE public.redirects
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_by to redirect_issues
ALTER TABLE public.redirect_issues
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Auto-set created_by on redirects via trigger
CREATE OR REPLACE FUNCTION public.set_redirect_created_by()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_redirect_created_by
  BEFORE INSERT ON public.redirects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_redirect_created_by();

-- Auto-set created_by on redirect_issues via trigger
CREATE OR REPLACE FUNCTION public.set_issue_created_by()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_issue_created_by
  BEFORE INSERT ON public.redirect_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_issue_created_by();