-- Create public storage bucket for sitemaps
INSERT INTO storage.buckets (id, name, public)
VALUES ('sitemaps', 'sitemaps', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to sitemaps
CREATE POLICY "Sitemaps are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sitemaps');

-- Allow service role to upload (edge functions use service role)
CREATE POLICY "Service role can upload sitemaps"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'sitemaps');

CREATE POLICY "Service role can update sitemaps"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'sitemaps');

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;