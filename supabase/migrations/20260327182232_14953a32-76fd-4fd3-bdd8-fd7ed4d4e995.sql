
-- Add locale column to cms_pages with default 'de'
ALTER TABLE public.cms_pages ADD COLUMN locale text NOT NULL DEFAULT 'de';

-- Update existing rows to 'de'
UPDATE public.cms_pages SET locale = 'de' WHERE locale IS NULL OR locale = '';

-- Drop existing unique constraint on slug if any, add composite unique on slug+locale
ALTER TABLE public.cms_pages DROP CONSTRAINT IF EXISTS cms_pages_slug_key;
ALTER TABLE public.cms_pages ADD CONSTRAINT cms_pages_slug_locale_key UNIQUE (slug, locale);
