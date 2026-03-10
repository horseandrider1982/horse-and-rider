import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, X, Check, RefreshCw, Sparkles, Database } from "lucide-react";
import { toast } from "sonner";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  seo_text: string | null;
  website_url: string | null;
  featured: boolean;
  is_active: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] || c))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function BrandManager() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const fetchBrands = async () => {
    setLoading(true);
    const { data } = await (supabase.from("brands" as any).select("*").order("name") as any);
    setBrands((data as BrandRow[]) || []);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-brands");
      if (error) throw error;
      toast.success(`Sync abgeschlossen: ${data?.inserted ?? 0} neue Marken hinzugefügt`);
      fetchBrands();
    } catch (e: any) {
      toast.error("Sync fehlgeschlagen: " + (e.message || "Unbekannter Fehler"));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleNew = () => {
    setIsNew(true);
    setEditing({ id: "", name: "", slug: "", logo_url: null, seo_text: null, website_url: null, featured: false, is_active: true });
  };

  const handleSave = async () => {
    if (!editing) return;
    const slug = editing.slug || slugify(editing.name);
    const payload = { name: editing.name, slug, logo_url: editing.logo_url, seo_text: editing.seo_text, website_url: editing.website_url, featured: editing.featured, is_active: editing.is_active };

    if (isNew) {
      const { error } = await (supabase.from("brands" as any).insert(payload) as any);
      if (error) { toast.error("Fehler beim Speichern: " + error.message); return; }
      toast.success("Marke erstellt");
    } else {
      const { error } = await (supabase.from("brands" as any).update(payload).eq("id", editing.id) as any);
      if (error) { toast.error("Fehler beim Speichern: " + error.message); return; }
      toast.success("Marke aktualisiert");
    }
    setEditing(null);
    setIsNew(false);
    fetchBrands();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Marke wirklich löschen?")) return;
    await (supabase.from("brands" as any).delete().eq("id", id) as any);
    toast.success("Marke gelöscht");
    fetchBrands();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (editing) {
    return (
      <div className="space-y-4 max-w-lg">
        <h3 className="font-semibold text-lg">{isNew ? "Neue Marke" : "Marke bearbeiten"}</h3>
        <div>
          <Label>Name</Label>
          <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: slugify(e.target.value) })} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
        </div>
        <div>
          <Label>Logo URL</Label>
          <Input value={editing.logo_url || ""} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value || null })} placeholder="https://..." />
        </div>
        <div>
          <Label>SEO-Text (HTML erlaubt)</Label>
          <Textarea rows={8} value={editing.seo_text || ""} onChange={(e) => setEditing({ ...editing, seo_text: e.target.value || null })} placeholder="<h3>Über die Marke...</h3><p>...</p>" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={generating || !editing.name}
            onClick={async () => {
              setGenerating(true);
              try {
                const { data, error } = await supabase.functions.invoke("generate-brand-seo", {
                  body: {
                    brandName: editing.name,
                    websiteUrl: editing.website_url,
                    existingSeoText: editing.seo_text,
                  },
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
                if (data?.seo_text) {
                  setEditing({ ...editing, seo_text: data.seo_text });
                  toast.success(data.scraped ? "SEO-Text aus Website-Daten generiert" : "SEO-Text generiert (ohne Website-Daten)");
                }
              } catch (e: any) {
                toast.error("Fehler: " + (e.message || "Text konnte nicht generiert werden"));
              } finally {
                setGenerating(false);
              }
            }}
          >
            <Sparkles className={`h-4 w-4 mr-1 ${generating ? "animate-pulse" : ""}`} />
            {generating ? "Generiere SEO-Text…" : "SEO-Text mit KI generieren"}
          </Button>
        </div>
        <div>
          <Label>URL Marke (wird nicht veröffentlicht)</Label>
          <Input value={editing.website_url || ""} onChange={(e) => setEditing({ ...editing, website_url: e.target.value || null })} placeholder="https://www.marke.com" />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} />
          <Label>Featured</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
          <Label>Aktiv</Label>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave}><Check className="h-4 w-4 mr-1" />Speichern</Button>
          <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}><X className="h-4 w-4 mr-1" />Abbrechen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{brands.length} Marken gepflegt · Täglicher Auto-Sync um 03:00 Uhr</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync läuft…" : "Shopify-Sync"}
          </Button>
          <Button size="sm" onClick={handleNew}><Plus className="h-4 w-4 mr-1" />Neue Marke</Button>
        </div>
      </div>

      {brands.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          Noch keine Marken gepflegt. Marken werden automatisch aus Shopify-Vendor-Daten generiert.
          Hier können Sie Logos und SEO-Texte hinterlegen.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Marke</th>
                <th className="text-left py-3 px-2 font-medium">Logo</th>
                <th className="text-left py-3 px-2 font-medium">SEO-Text</th>
                <th className="text-left py-3 px-2 font-medium">Featured</th>
                <th className="text-right py-3 px-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-3 px-2 font-medium">{b.name}</td>
                  <td className="py-3 px-2">
                    {b.logo_url ? <img src={b.logo_url} alt="" className="h-8 w-auto" /> : <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{b.seo_text ? "✓" : "–"}</td>
                  <td className="py-3 px-2">{b.featured ? "★" : "–"}</td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setIsNew(false); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
