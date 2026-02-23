import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { ShopifyProductPicker } from '@/components/admin/ShopifyProductPicker';
import {
  useAdminArticle, useAdminArticleProducts, useSaveArticle,
  generateSlug, CATEGORY_LABELS,
  type NewsCategory, type NewsStatus, type NewsArticle,
} from '@/hooks/useNewsArticles';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Eye, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface NewsEditorProps {
  articleId?: string;
  duplicateFrom?: NewsArticle | null;
  onBack: () => void;
}

export default function NewsEditor({ articleId, duplicateFrom, onBack }: NewsEditorProps) {
  const { data: existingArticle, isLoading: loadingArticle } = useAdminArticle(articleId || '');
  const { data: existingProducts } = useAdminArticleProducts(articleId || '');
  const saveArticle = useSaveArticle();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverAlt, setCoverAlt] = useState('');
  const [category, setCategory] = useState<NewsCategory>('horse_rider_news');
  const [status, setStatus] = useState<NewsStatus>('draft');
  const [publishedAt, setPublishedAt] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [relatedHandles, setRelatedHandles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Load existing article
  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title);
      setSlug(existingArticle.slug);
      setSlugManual(true);
      setExcerpt(existingArticle.excerpt || '');
      setContent(existingArticle.content);
      setCoverUrl(existingArticle.cover_image_url || '');
      setCoverAlt(existingArticle.cover_image_alt || '');
      setCategory(existingArticle.category);
      setStatus(existingArticle.status);
      setPublishedAt(existingArticle.published_at?.slice(0, 16) || '');
      setSeoTitle(existingArticle.seo_title || '');
      setSeoDesc(existingArticle.seo_description || '');
    }
  }, [existingArticle]);

  // Load existing products
  useEffect(() => {
    if (existingProducts) {
      setRelatedHandles(existingProducts.map(p => p.shopify_handle));
    }
  }, [existingProducts]);

  // Load from duplicate
  useEffect(() => {
    if (duplicateFrom) {
      setTitle(duplicateFrom.title + ' (Kopie)');
      setSlug(generateSlug(duplicateFrom.title + ' kopie'));
      setExcerpt(duplicateFrom.excerpt || '');
      setContent(duplicateFrom.content);
      setCoverUrl(duplicateFrom.cover_image_url || '');
      setCoverAlt(duplicateFrom.cover_image_alt || '');
      setCategory(duplicateFrom.category);
      setStatus('draft');
    }
  }, [duplicateFrom]);

  // Auto-slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManual]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('news-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('news-images').getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      toast.success('Bild hochgeladen');
    } catch {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (overrideStatus?: NewsStatus) => {
    const finalStatus = overrideStatus || status;
    if (!title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    try {
      await saveArticle.mutateAsync({
        id: articleId,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content,
        cover_image_url: coverUrl || null,
        cover_image_alt: coverAlt || null,
        category,
        status: finalStatus,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        relatedHandles,
      });
      toast.success(finalStatus === 'published' ? 'Artikel veröffentlicht' : 'Artikel gespeichert');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  if (articleId && loadingArticle) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" />Zurück</Button>
        <div className="flex items-center gap-2">
          {slug && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/news/${slug}`} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-1.5" />Vorschau</a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={saveArticle.isPending}>
            Als Entwurf
          </Button>
          <Button size="sm" onClick={() => handleSave('published')} disabled={saveArticle.isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            {saveArticle.isPending ? 'Speichert…' : 'Veröffentlichen'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content - 2 cols */}
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-1.5">
            <Label>Titel *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Artikeltitel" />
          </div>

          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={e => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="artikel-url-slug"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Auszug</Label>
            <Input value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Kurzer Teaser-Text (optional, wird automatisch generiert)" />
          </div>

          <div className="space-y-1.5">
            <Label>Inhalt *</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as NewsStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="published">Veröffentlicht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as NewsCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Veröffentlichungsdatum</Label>
                <Input type="datetime-local" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cover-Bild</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coverUrl && (
                <img src={coverUrl} alt={coverAlt} className="w-full h-32 rounded object-cover" />
              )}
              <div>
                <Label htmlFor="cover-upload" className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Lädt…' : 'Bild hochladen'}
                </Label>
                <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </div>
              <div className="space-y-1.5">
                <Label>Bild-URL</Label>
                <Input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>Alt-Text</Label>
                <Input value={coverAlt} onChange={e => setCoverAlt(e.target.value)} placeholder="Bildbeschreibung" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>SEO-Titel</Label>
                <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Titel für Suchmaschinen" maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label>SEO-Beschreibung</Label>
                <Input value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Beschreibung für Suchmaschinen" maxLength={160} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Passende Produkte</CardTitle>
            </CardHeader>
            <CardContent>
              <ShopifyProductPicker selectedHandles={relatedHandles} onChange={setRelatedHandles} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
