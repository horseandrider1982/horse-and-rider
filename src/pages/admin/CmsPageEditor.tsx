import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useAdminCmsPage, useSaveCmsPage, generateSlug, type CmsPage } from '@/hooks/useCmsPages';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Eye, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface CmsPageEditorProps {
  pageId?: string;
  duplicateFrom?: CmsPage | null;
  onBack: () => void;
}

export default function CmsPageEditor({ pageId, duplicateFrom, onBack }: CmsPageEditorProps) {
  const { data: existing, isLoading } = useAdminCmsPage(pageId || '');
  const savePage = useSaveCmsPage();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editorMode, setEditorMode] = useState<'standard' | 'ai'>('standard');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  const [locale, setLocale] = useState('de');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSlug(existing.slug);
      setSlugManual(true);
      setTitle(existing.title);
      setContent(existing.content);
      setEditorMode(existing.editor_mode);
      setStatus(existing.status);
      setLocale((existing as any).locale || 'de');
      setSeoTitle(existing.seo_title || '');
      setSeoDesc(existing.seo_description || '');
    }
  }, [existing]);

  useEffect(() => {
    if (duplicateFrom) {
      setName(duplicateFrom.name + ' (Kopie)');
      setSlug(generateSlug(duplicateFrom.name + ' kopie'));
      setTitle(duplicateFrom.title);
      setContent(duplicateFrom.content);
      setEditorMode(duplicateFrom.editor_mode);
      setStatus('draft');
      setLocale((duplicateFrom as any).locale || 'de');
      setSeoTitle(duplicateFrom.seo_title || '');
      setSeoDesc(duplicateFrom.seo_description || '');
    }
  }, [duplicateFrom]);

  useEffect(() => {
    if (!slugManual && name) setSlug(generateSlug(name));
  }, [name, slugManual]);

  const handleSave = async (overrideStatus?: 'draft' | 'active') => {
    const finalStatus = overrideStatus || status;
    if (!name.trim() || !slug.trim() || !title.trim()) {
      toast.error('Name, Slug und Titel sind erforderlich');
      return;
    }
    try {
      await savePage.mutateAsync({
        id: pageId,
        name: name.trim(),
        slug: slug.trim(),
        title: title.trim(),
        content,
        editor_mode: editorMode,
        status: finalStatus,
        locale,
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        ...(finalStatus === 'active' && !existing?.published_at ? { published_at: new Date().toISOString() } : {}),
      } as any);
      toast.success(finalStatus === 'active' ? 'Seite aktiviert' : 'Seite gespeichert');
      onBack();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Speichern');
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error('Bitte einen Prompt eingeben'); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cms-ai-generate', {
        body: { prompt: aiPrompt.trim(), pageTitle: title || name },
      });
      if (error) throw error;
      if (data?.content) {
        setContent(data.content);
        toast.success('Text generiert und übernommen');
      } else {
        throw new Error('Keine Antwort erhalten');
      }
    } catch (err: any) {
      toast.error(err.message || 'Fehler bei der KI-Generierung');
    } finally {
      setAiLoading(false);
    }
  };

  if (pageId && isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1.5" />Zurück</Button>
        <div className="flex items-center gap-2">
          {slug && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/pages/${slug}`} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4 mr-1.5" />Vorschau</a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave('draft')} disabled={savePage.isPending}>Als Entwurf</Button>
          <Button size="sm" onClick={() => handleSave('active')} disabled={savePage.isPending}>
            <Save className="h-4 w-4 mr-1.5" />{savePage.isPending ? 'Speichert…' : 'Aktivieren'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-1.5">
            <Label>Name (intern) *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Interner Seitenname" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input value={slug} onChange={e => { setSlug(e.target.value); setSlugManual(true); }} placeholder="seiten-url-slug" />
          </div>
          <div className="space-y-1.5">
            <Label>Titel (Frontend H1) *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Seitentitel" />
          </div>

          {/* Editor Mode Toggle */}
          <div className="space-y-3">
            <Label>Editor</Label>
            <div className="flex gap-2">
              <Button variant={editorMode === 'standard' ? 'default' : 'outline'} size="sm" onClick={() => setEditorMode('standard')}>
                Standard Editor
              </Button>
              <Button variant={editorMode === 'ai' ? 'default' : 'outline'} size="sm" onClick={() => setEditorMode('ai')}>
                <Sparkles className="h-4 w-4 mr-1.5" />KI Editor
              </Button>
            </div>
          </div>

          {editorMode === 'ai' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" />KI Textgenerierung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="Beschreiben Sie den gewünschten Seiteninhalt… z.B. 'Erstelle einen AGB-Text für einen Online-Reitsportshop'"
                  rows={3}
                />
                <Button onClick={handleAiGenerate} disabled={aiLoading} size="sm">
                  {aiLoading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generiert…</> : <><Sparkles className="h-4 w-4 mr-1.5" />Text generieren</>}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="space-y-1.5">
            <Label>Inhalt</Label>
            <RichTextEditor key={content ? 'loaded' : 'empty'} content={content} onChange={setContent} />
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Einstellungen</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Sprache</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                    <SelectItem value="nl">🇳🇱 Nederlands</SelectItem>
                    <SelectItem value="pl">🇵🇱 Polski</SelectItem>
                    <SelectItem value="da">🇩🇰 Dansk</SelectItem>
                    <SelectItem value="sv">🇸🇪 Svenska</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'active')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>SEO-Titel</Label>
                <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Titel für Suchmaschinen" maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label>SEO-Beschreibung</Label>
                <Textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} placeholder="Beschreibung für Suchmaschinen" maxLength={160} rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
