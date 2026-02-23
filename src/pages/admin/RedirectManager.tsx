import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Plus, Trash2, Upload, Search, Pencil, Check, X,
  AlertTriangle, Link2, Download, Zap, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { normalizeUrl } from "@/lib/urlNormalize";

interface Redirect {
  id: string;
  old_url: string;
  new_url: string;
  old_path: string | null;
  new_path: string | null;
  article_number: string | null;
  sku: string | null;
  is_active: boolean;
  source: string | null;
  priority: number | null;
  canonical_key: string | null;
  entity_type: string | null;
  created_at: string;
}

interface RedirectIssue {
  id: string;
  type: string;
  severity: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface EntityPath {
  id: string;
  canonical_key: string;
  path: string;
  first_seen_at: string;
  last_seen_at: string;
  is_current: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manuell",
  import_csv: "CSV Import",
  auto_url_change: "Auto",
  migration_seed: "Seed",
  system_collapse: "Kollaps",
};

const ISSUE_LABELS: Record<string, string> = {
  loop_detected: "Loop erkannt",
  chain_detected: "Kette erkannt",
  duplicate_old_path: "Duplikat",
  missing_target: "Ziel fehlt",
  import_sku_not_found: "SKU nicht gefunden",
  import_old_path_conflict: "Import-Konflikt",
};

const SEVERITY_COLORS: Record<string, string> = {
  info: "secondary",
  warning: "outline",
  critical: "destructive",
};

export default function RedirectManager() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [issues, setIssues] = useState<RedirectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [newRow, setNewRow] = useState({ old_url: "", new_url: "", sku: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ old_url: "", new_url: "", sku: "" });
  const [historyDialog, setHistoryDialog] = useState<string | null>(null);
  const [entityPaths, setEntityPaths] = useState<EntityPath[]>([]);
  const [importReport, setImportReport] = useState<{ success: number; notFound: string[]; conflicts: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    const [{ data: rData }, { data: iData }] = await Promise.all([
      supabase.from("redirects").select("*").order("new_url", { ascending: true }),
      supabase.from("redirect_issues").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(50),
    ]);
    setRedirects((rData as Redirect[]) || []);
    setIssues((iData as RedirectIssue[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Add redirect with loop check
  const addRow = async () => {
    if (!newRow.new_url) { toast.error("Neue URL ist erforderlich"); return; }
    const oldNorm = normalizeUrl(newRow.old_url);
    const newNorm = normalizeUrl(newRow.new_url);

    if (oldNorm && oldNorm === newNorm) {
      toast.error("Alte und neue URL dürfen nicht identisch sein");
      return;
    }

    // Client-side loop check
    if (oldNorm) {
      const { data: hasLoop } = await supabase.rpc("check_redirect_loop", {
        p_old_path: oldNorm,
        p_new_path: newNorm,
      });
      if (hasLoop) {
        toast.error("Loop erkannt! Dieser Redirect würde eine Endlosschleife erzeugen.");
        return;
      }
    }

    const { error } = await supabase.from("redirects").insert({
      old_url: newRow.old_url,
      new_url: newRow.new_url,
      article_number: newRow.sku || null,
      sku: newRow.sku || null,
      is_active: !!newRow.old_url,
      source: "manual" as any,
    });
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Alte URL existiert bereits" : "Fehler beim Speichern");
    } else {
      setNewRow({ old_url: "", new_url: "", sku: "" });
      fetchAll();
      toast.success("Weiterleitung hinzugefügt");
    }
  };

  const deleteRow = async (id: string) => {
    await supabase.from("redirects").delete().eq("id", id);
    fetchAll();
    toast.success("Gelöscht");
  };

  const startEdit = (r: Redirect) => {
    setEditId(r.id);
    setEditData({ old_url: r.old_url, new_url: r.new_url, sku: r.sku || r.article_number || "" });
  };

  const saveEdit = async () => {
    if (!editId) return;
    const oldNorm = normalizeUrl(editData.old_url);
    const newNorm = normalizeUrl(editData.new_url);

    if (oldNorm && oldNorm === newNorm) {
      toast.error("Alte und neue URL dürfen nicht identisch sein");
      return;
    }

    const { error } = await supabase.from("redirects").update({
      old_url: editData.old_url,
      new_url: editData.new_url,
      article_number: editData.sku || null,
      sku: editData.sku || null,
      is_active: !!editData.old_url,
    }).eq("id", editId);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      setEditId(null);
      fetchAll();
      toast.success("Gespeichert");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("redirects").update({ is_active: !current }).eq("id", id);
    fetchAll();
  };

  // Chain collapse
  const runCollapse = async () => {
    const { data, error } = await supabase.rpc("collapse_redirect_chains");
    if (error) {
      toast.error("Fehler beim Chain-Kollaps");
    } else {
      toast.success(`Chain-Kollaps: ${data} Redirects optimiert`);
      fetchAll();
    }
  };

  // CSV Import
  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const sep = lines[0]?.includes(";") ? ";" : ",";
    const rows = lines.slice(1).map(l => {
      const parts = l.split(sep).map(p => p.trim().replace(/^"|"$/g, ""));
      return { sku: parts[0], old_url: parts[1] };
    }).filter(r => r.sku && r.old_url);

    if (rows.length === 0) {
      toast.error("Keine gültigen Zeilen. Erwarte: SKU;Alte URL");
      return;
    }

    let success = 0;
    const notFound: string[] = [];
    const conflicts: string[] = [];

    for (const row of rows) {
      const normalized = normalizeUrl(row.old_url);

      // Check if SKU exists
      const { data: existing } = await supabase
        .from("redirects")
        .select("id, new_url")
        .or(`sku.eq.${row.sku},article_number.eq.${row.sku}`)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        notFound.push(row.sku);
        await supabase.from("redirect_issues").insert({
          type: "import_sku_not_found" as any,
          severity: "warning" as any,
          payload: { sku: row.sku, old_url: row.old_url },
        });
        continue;
      }

      // Check for duplicate old_path
      const { data: dup } = await supabase
        .from("redirects")
        .select("id")
        .eq("old_path", normalized)
        .neq("id", existing.id)
        .maybeSingle();

      if (dup) {
        conflicts.push(`${row.sku}: ${row.old_url}`);
        await supabase.from("redirect_issues").insert({
          type: "import_old_path_conflict" as any,
          severity: "warning" as any,
          payload: { sku: row.sku, old_url: row.old_url, existing_redirect_id: dup.id },
        });
        continue;
      }

      const { error } = await supabase
        .from("redirects")
        .update({
          old_url: row.old_url,
          is_active: true,
          source: "import_csv" as any,
        })
        .eq("id", existing.id);

      if (!error) success++;
    }

    setImportReport({ success, notFound, conflicts });
    fetchAll();
    if (fileRef.current) fileRef.current.value = "";
    toast.success(`Import: ${success} von ${rows.length} erfolgreich`);
  };

  // Export CSV
  const exportCSV = () => {
    const header = "SKU;Alte URL;Neue URL;Status;Quelle\n";
    const body = redirects.map(r =>
      `"${r.sku || r.article_number || ""}";"${r.old_url}";"${r.new_url}";"${r.is_active ? 'aktiv' : 'inaktiv'}";"${r.source || 'manual'}"`
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redirects-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // View URL history
  const viewHistory = async (canonicalKey: string) => {
    setHistoryDialog(canonicalKey);
    const { data } = await supabase
      .from("entity_paths")
      .select("*")
      .eq("canonical_key", canonicalKey)
      .order("last_seen_at", { ascending: false });
    setEntityPaths((data as EntityPath[]) || []);
  };

  // Resolve issue
  const resolveIssue = async (id: string, status: "resolved" | "ignored") => {
    await supabase.from("redirect_issues").update({
      status: status as any,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    fetchAll();
    toast.success(status === "resolved" ? "Issue gelöst" : "Issue ignoriert");
  };

  // Filtering
  const filtered = redirects.filter(r => {
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return r.old_url.toLowerCase().includes(s) ||
      r.new_url.toLowerCase().includes(s) ||
      (r.sku || r.article_number || "").toLowerCase().includes(s) ||
      (r.canonical_key || "").toLowerCase().includes(s);
  });

  const activeCount = redirects.filter(r => r.is_active).length;
  const openIssuesCount = issues.length;

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{redirects.length}</div>
          <div className="text-xs text-muted-foreground">Gesamt</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-xs text-muted-foreground">Aktiv</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{openIssuesCount}</div>
          <div className="text-xs text-muted-foreground">Offene Issues</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{redirects.filter(r => r.source === "system_collapse").length}</div>
          <div className="text-xs text-muted-foreground">Kollabiert</div>
        </div>
      </div>

      {/* Open Issues */}
      {issues.length > 0 && (
        <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" /> {issues.length} offene Issues
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {issues.slice(0, 10).map(issue => (
              <div key={issue.id} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={SEVERITY_COLORS[issue.severity] as any || "secondary"}>
                    {issue.severity}
                  </Badge>
                  <span>{ISSUE_LABELS[issue.type] || issue.type}</span>
                  <span className="text-xs text-muted-foreground">
                    {JSON.stringify(issue.payload).slice(0, 80)}
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => resolveIssue(issue.id, "resolved")}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resolveIssue(issue.id, "ignored")}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Report */}
      {importReport && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
          <h3 className="font-semibold">Import-Bericht</h3>
          <div className="text-sm space-y-1">
            <p className="text-green-600">✓ {importReport.success} erfolgreich importiert</p>
            {importReport.notFound.length > 0 && (
              <p className="text-amber-600">⚠ {importReport.notFound.length} SKUs nicht gefunden: {importReport.notFound.slice(0, 5).join(", ")}{importReport.notFound.length > 5 ? "…" : ""}</p>
            )}
            {importReport.conflicts.length > 0 && (
              <p className="text-red-600">✗ {importReport.conflicts.length} Konflikte: {importReport.conflicts.slice(0, 3).join(", ")}{importReport.conflicts.length > 3 ? "…" : ""}</p>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setImportReport(null)}>Schließen</Button>
        </div>
      )}

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suche nach URL, SKU, Key…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Quelle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Quellen</SelectItem>
            <SelectItem value="manual">Manuell</SelectItem>
            <SelectItem value="import_csv">CSV Import</SelectItem>
            <SelectItem value="auto_url_change">Auto</SelectItem>
            <SelectItem value="system_collapse">Kollaps</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />CSV Import
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />Export
          </Button>
          <Button variant="outline" onClick={runCollapse}>
            <Zap className="h-4 w-4 mr-2" />Kollaps
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        CSV-Format: <code>SKU;Alte URL</code> – Die alte URL wird per SKU/Artikelnummer zugeordnet.
      </p>

      {/* Add new row */}
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
        <Input placeholder="Alte URL" value={newRow.old_url} onChange={e => setNewRow(p => ({ ...p, old_url: e.target.value }))} />
        <Input placeholder="Neue URL" value={newRow.new_url} onChange={e => setNewRow(p => ({ ...p, new_url: e.target.value }))} />
        <Input placeholder="SKU" value={newRow.sku} onChange={e => setNewRow(p => ({ ...p, sku: e.target.value }))} className="w-28" />
        <Button onClick={addRow} size="icon"><Plus className="h-4 w-4" /></Button>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alte URL</TableHead>
              <TableHead>Neue URL</TableHead>
              <TableHead className="w-24">SKU</TableHead>
              <TableHead className="w-20">Quelle</TableHead>
              <TableHead className="w-16">Aktiv</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Keine Weiterleitungen gefunden.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(r => (
              <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                {editId === r.id ? (
                  <>
                    <TableCell><Input value={editData.old_url} onChange={e => setEditData(p => ({ ...p, old_url: e.target.value }))} /></TableCell>
                    <TableCell><Input value={editData.new_url} onChange={e => setEditData(p => ({ ...p, new_url: e.target.value }))} /></TableCell>
                    <TableCell><Input value={editData.sku} onChange={e => setEditData(p => ({ ...p, sku: e.target.value }))} /></TableCell>
                    <TableCell></TableCell>
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
                    <TableCell className="font-mono text-xs break-all">
                      {r.old_url || <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs break-all">{r.new_url}</TableCell>
                    <TableCell className="text-xs">{r.sku || r.article_number || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {SOURCE_LABELS[r.source || "manual"] || r.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => toggleActive(r.id, r.is_active)}
                        className={`inline-block w-3 h-3 rounded-full cursor-pointer ${r.is_active ? "bg-green-500" : "bg-muted-foreground/30"}`}
                        title={r.is_active ? "Deaktivieren" : "Aktivieren"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)} title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {r.canonical_key && (
                          <Button size="icon" variant="ghost" onClick={() => viewHistory(r.canonical_key!)} title="URL-Historie">
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => deleteRow(r.id)} title="Löschen">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
        {filtered.length} Einträge • {activeCount} aktiv • Weiterleitungen mit Loop-Check & Chain-Kollaps.
      </p>

      {/* URL History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={() => setHistoryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>URL-Historie: {historyDialog}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entityPaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Historie vorhanden.</p>
            ) : (
              entityPaths.map(ep => (
                <div key={ep.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <code className="text-xs">{ep.path}</code>
                    {ep.is_current && <Badge className="ml-2" variant="secondary">Aktuell</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(ep.first_seen_at).toLocaleDateString("de-DE")} – {new Date(ep.last_seen_at).toLocaleDateString("de-DE")}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialog(null)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
