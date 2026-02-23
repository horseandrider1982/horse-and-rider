import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Upload, Search, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Redirect {
  id: string;
  old_url: string;
  new_url: string;
  article_number: string | null;
  is_active: boolean;
  created_at: string;
}

// All known static + dynamic route patterns
const STATIC_PAGES: { new_url: string; article_number: string }[] = [
  { new_url: "/", article_number: "" },
  { new_url: "/unsere-marken", article_number: "" },
  { new_url: "/news", article_number: "" },
  { new_url: "/impressum", article_number: "" },
  { new_url: "/datenschutz", article_number: "" },
  { new_url: "/agb", article_number: "" },
  { new_url: "/widerrufsrecht", article_number: "" },
  { new_url: "/kontakt", article_number: "" },
  { new_url: "/auth", article_number: "" },
  { new_url: "/account", article_number: "" },
  { new_url: "/search", article_number: "" },
];

export default function RedirectManager() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newRow, setNewRow] = useState({ old_url: "", new_url: "", article_number: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ old_url: "", new_url: "", article_number: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRedirects = useCallback(async () => {
    const { data, error } = await supabase
      .from("redirects")
      .select("*")
      .order("new_url", { ascending: true });
    if (error) {
      toast.error("Fehler beim Laden der Weiterleitungen");
    } else {
      setRedirects(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRedirects(); }, [fetchRedirects]);

  // Seed static pages that don't have entries yet
  const seedStaticPages = useCallback(async () => {
    const existing = new Set(redirects.map(r => r.new_url));
    const toInsert = STATIC_PAGES.filter(p => !existing.has(p.new_url)).map(p => ({
      old_url: "",
      new_url: p.new_url,
      article_number: p.article_number,
      is_active: false,
    }));
    if (toInsert.length > 0) {
      await supabase.from("redirects").insert(toInsert);
      fetchRedirects();
    }
  }, [redirects, fetchRedirects]);

  useEffect(() => {
    if (!loading && redirects.length === 0) {
      seedStaticPages();
    }
  }, [loading]); // eslint-disable-line

  const addRow = async () => {
    if (!newRow.new_url) { toast.error("Neue URL ist erforderlich"); return; }
    const { error } = await supabase.from("redirects").insert({
      old_url: newRow.old_url,
      new_url: newRow.new_url,
      article_number: newRow.article_number || null,
      is_active: !!newRow.old_url,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Alte URL existiert bereits" : "Fehler beim Speichern");
    } else {
      setNewRow({ old_url: "", new_url: "", article_number: "" });
      fetchRedirects();
      toast.success("Weiterleitung hinzugefügt");
    }
  };

  const deleteRow = async (id: string) => {
    await supabase.from("redirects").delete().eq("id", id);
    fetchRedirects();
    toast.success("Gelöscht");
  };

  const startEdit = (r: Redirect) => {
    setEditId(r.id);
    setEditData({ old_url: r.old_url, new_url: r.new_url, article_number: r.article_number || "" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const { error } = await supabase.from("redirects").update({
      old_url: editData.old_url,
      new_url: editData.new_url,
      article_number: editData.article_number || null,
      is_active: !!editData.old_url,
    }).eq("id", editId);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      setEditId(null);
      fetchRedirects();
      toast.success("Gespeichert");
    }
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    // Expect header: article_number,old_url or article_number;old_url
    const sep = lines[0]?.includes(";") ? ";" : ",";
    const rows = lines.slice(1).map(l => {
      const parts = l.split(sep).map(p => p.trim().replace(/^"|"$/g, ""));
      return { article_number: parts[0], old_url: parts[1] };
    }).filter(r => r.article_number && r.old_url);

    if (rows.length === 0) {
      toast.error("Keine gültigen Zeilen in CSV gefunden. Erwarte: Artikelnummer, Alte URL");
      return;
    }

    let updated = 0;
    for (const row of rows) {
      const { error } = await supabase
        .from("redirects")
        .update({ old_url: row.old_url, is_active: true })
        .eq("article_number", row.article_number);
      if (!error) updated++;
    }
    toast.success(`${updated} von ${rows.length} Weiterleitungen aktualisiert`);
    fetchRedirects();
    if (fileRef.current) fileRef.current.value = "";
  };

  const filtered = redirects.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.old_url.toLowerCase().includes(s) ||
      r.new_url.toLowerCase().includes(s) ||
      (r.article_number || "").toLowerCase().includes(s);
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Search & CSV */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach URL oder Artikelnummer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />CSV Import
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV-Format: <code>Artikelnummer{";"}Alte URL</code> – Die alte URL wird per Artikelnummer zugeordnet.
      </p>

      {/* Add new row */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
        <Input placeholder="Alte URL" value={newRow.old_url} onChange={e => setNewRow(p => ({ ...p, old_url: e.target.value }))} />
        <Input placeholder="Neue URL" value={newRow.new_url} onChange={e => setNewRow(p => ({ ...p, new_url: e.target.value }))} />
        <Input placeholder="Art.-Nr." value={newRow.article_number} onChange={e => setNewRow(p => ({ ...p, article_number: e.target.value }))} className="w-28" />
        <Button onClick={addRow} size="icon"><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alte URL</TableHead>
              <TableHead>Neue URL</TableHead>
              <TableHead className="w-28">Art.-Nr.</TableHead>
              <TableHead className="w-16">Aktiv</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Keine Weiterleitungen gefunden.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(r => (
              <TableRow key={r.id}>
                {editId === r.id ? (
                  <>
                    <TableCell><Input value={editData.old_url} onChange={e => setEditData(p => ({ ...p, old_url: e.target.value }))} /></TableCell>
                    <TableCell><Input value={editData.new_url} onChange={e => setEditData(p => ({ ...p, new_url: e.target.value }))} /></TableCell>
                    <TableCell><Input value={editData.article_number} onChange={e => setEditData(p => ({ ...p, article_number: e.target.value }))} /></TableCell>
                    <TableCell className="text-center">{editData.old_url ? "✓" : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-mono text-xs break-all">{r.old_url || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="font-mono text-xs break-all">{r.new_url}</TableCell>
                    <TableCell className="text-xs">{r.article_number || "—"}</TableCell>
                    <TableCell className="text-center">{r.is_active ? "✓" : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteRow(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} Einträge • Weiterleitungen sind aktiv, sobald eine alte URL eingetragen ist.
      </p>
    </div>
  );
}
