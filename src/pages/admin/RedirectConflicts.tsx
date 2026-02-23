import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Check, X, Eye, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";

interface RedirectIssue {
  id: string;
  type: string;
  severity: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const ISSUE_LABELS: Record<string, string> = {
  loop_detected: "Redirect-Loop erkannt",
  chain_detected: "Redirect-Kette erkannt",
  duplicate_old_path: "Duplikat (alte URL)",
  missing_target: "Ziel-URL fehlt",
  import_sku_not_found: "SKU nicht gefunden (Import)",
  import_old_path_conflict: "Import-Konflikt",
};

const SEVERITY_ICONS: Record<string, typeof AlertTriangle> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_VARIANTS: Record<string, "destructive" | "outline" | "secondary"> = {
  critical: "destructive",
  warning: "outline",
  info: "secondary",
};

export default function RedirectConflicts() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [issues, setIssues] = useState<RedirectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [detailIssue, setDetailIssue] = useState<RedirectIssue | null>(null);

  const fetchIssues = useCallback(async () => {
    let query = supabase
      .from("redirect_issues")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }
    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter as any);
    }

    const { data } = await query;
    setIssues((data as RedirectIssue[]) || []);
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const resolveIssue = async (id: string, status: "resolved" | "ignored") => {
    await supabase.from("redirect_issues").update({
      status: status as any,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    fetchIssues();
    toast.success(status === "resolved" ? "Issue als gelöst markiert" : "Issue ignoriert");
  };

  const bulkResolve = async (status: "resolved" | "ignored") => {
    const ids = issues.filter(i => i.status === "open").map(i => i.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from("redirect_issues").update({
        status: status as any,
        resolved_at: new Date().toISOString(),
      }).eq("id", id);
    }
    fetchIssues();
    toast.success(`${ids.length} Issues ${status === "resolved" ? "gelöst" : "ignoriert"}`);
  };

  const rerunCollapse = async () => {
    const { data, error } = await supabase.rpc("collapse_redirect_chains");
    if (error) {
      toast.error("Fehler beim Chain-Kollaps");
    } else {
      toast.success(`Chain-Kollaps: ${data} Redirects optimiert`);
      fetchIssues();
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) return null;

  const openCount = issues.filter(i => i.status === "open").length;
  const criticalCount = issues.filter(i => i.status === "open" && i.severity === "critical").length;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <h1 className="text-2xl font-heading font-bold">Konfliktzentrum</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin">Zurück</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Offene Issues</CardDescription>
                  <CardTitle className="text-3xl">{openCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card className={criticalCount > 0 ? "border-destructive" : ""}>
                <CardHeader className="pb-2">
                  <CardDescription>Kritisch</CardDescription>
                  <CardTitle className="text-3xl">{criticalCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Gesamt (gefiltert)</CardDescription>
                  <CardTitle className="text-3xl">{issues.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardContent className="pt-6 flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => bulkResolve("resolved")} disabled={openCount === 0}>
                    Alle lösen
                  </Button>
                  <Button size="sm" variant="outline" onClick={rerunCollapse}>
                    Kollaps ausführen
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="resolved">Gelöst</SelectItem>
                  <SelectItem value="ignored">Ignoriert</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="loop_detected">Loop</SelectItem>
                  <SelectItem value="chain_detected">Kette</SelectItem>
                  <SelectItem value="duplicate_old_path">Duplikat</SelectItem>
                  <SelectItem value="missing_target">Ziel fehlt</SelectItem>
                  <SelectItem value="import_sku_not_found">SKU nicht gefunden</SelectItem>
                  <SelectItem value="import_old_path_conflict">Import-Konflikt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Issues Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Schwere</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-16">Datum</TableHead>
                    <TableHead className="w-32"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Keine Issues gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                  {issues.map(issue => {
                    const SevIcon = SEVERITY_ICONS[issue.severity] || Info;
                    return (
                      <TableRow key={issue.id} className={issue.status !== "open" ? "opacity-50" : ""}>
                        <TableCell>
                          <Badge variant={SEVERITY_VARIANTS[issue.severity] || "secondary"} className="gap-1">
                            <SevIcon className="h-3 w-3" />
                            {issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {ISSUE_LABELS[issue.type] || issue.type}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {JSON.stringify(issue.payload).slice(0, 100)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{issue.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(issue.created_at).toLocaleDateString("de-DE")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setDetailIssue(issue)} title="Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {issue.status === "open" && (
                              <>
                                <Button size="icon" variant="ghost" onClick={() => resolveIssue(issue.id, "resolved")} title="Lösen">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => resolveIssue(issue.id, "ignored")} title="Ignorieren">
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!detailIssue} onOpenChange={() => setDetailIssue(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{detailIssue ? ISSUE_LABELS[detailIssue.type] || detailIssue.type : ""}</DialogTitle>
            </DialogHeader>
            {detailIssue && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant={SEVERITY_VARIANTS[detailIssue.severity] || "secondary"}>{detailIssue.severity}</Badge>
                  <Badge variant="secondary">{detailIssue.status}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Erstellt</p>
                  <p className="text-sm">{new Date(detailIssue.created_at).toLocaleString("de-DE")}</p>
                </div>
                {detailIssue.resolved_at && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gelöst</p>
                    <p className="text-sm">{new Date(detailIssue.resolved_at).toLocaleString("de-DE")}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payload</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(detailIssue.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            <DialogFooter>
              {detailIssue?.status === "open" && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { resolveIssue(detailIssue.id, "resolved"); setDetailIssue(null); }}>
                    Als gelöst markieren
                  </Button>
                  <Button variant="outline" onClick={() => { resolveIssue(detailIssue.id, "ignored"); setDetailIssue(null); }}>
                    Ignorieren
                  </Button>
                </div>
              )}
              <Button variant="outline" onClick={() => setDetailIssue(null)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
