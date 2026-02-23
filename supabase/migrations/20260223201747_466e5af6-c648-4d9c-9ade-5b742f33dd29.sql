
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read news images" ON storage.objects
  FOR SELECT USING (bucket_id = 'news-images');

CREATE POLICY "Admins upload news images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'news-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update news images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'news-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete news images" ON storage.objects
  FOR DELETE USING (bucket_id = 'news-images' AND has_role(auth.uid(), 'admin'));
