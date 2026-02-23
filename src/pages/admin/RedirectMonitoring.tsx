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
import { Loader2, ArrowLeft, TrendingUp, AlertTriangle, Activity, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface HitAggregate {
  day: string;
  old_path: string;
  new_path: string;
  hits: number;
  redirect_id: string;
}

interface IssueSummary {
  type: string;
  count: number;
}

export default function RedirectMonitoring() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [hits, setHits] = useState<HitAggregate[]>([]);
  const [issues, setIssues] = useState<{ type: string; severity: string; created_at: string }[]>([]);
  const [redirectCount, setRedirectCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7" | "30">("7");

  const fetchData = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));
    const sinceStr = since.toISOString().split("T")[0];

    const [hitsRes, issuesRes, totalRes, activeRes] = await Promise.all([
      supabase
        .from("redirect_hits")
        .select("*")
        .gte("day", sinceStr)
        .order("day", { ascending: true }),
      supabase
        .from("redirect_issues")
        .select("type, severity, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("redirects").select("id", { count: "exact", head: true }),
      supabase.from("redirects").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    setHits((hitsRes.data as HitAggregate[]) || []);
    setIssues(issuesRes.data || []);
    setRedirectCount(totalRes.count || 0);
    setActiveCount(activeRes.count || 0);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) return null;

  // Aggregate hits by day for chart
  const hitsByDay = hits.reduce<Record<string, number>>((acc, h) => {
    acc[h.day] = (acc[h.day] || 0) + h.hits;
    return acc;
  }, {});
  const chartData = Object.entries(hitsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day: new Date(day).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), hits: count }));

  // Top redirects by total hits
  const topRedirects = Object.values(
    hits.reduce<Record<string, { old_path: string; new_path: string; total: number }>>((acc, h) => {
      const key = h.old_path;
      if (!acc[key]) acc[key] = { old_path: h.old_path, new_path: h.new_path, total: 0 };
      acc[key].total += h.hits;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 10);

  // Issue summary
  const issueSummary = issues.reduce<Record<string, number>>((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  const totalHits = hits.reduce((s, h) => s + h.hits, 0);
  const loopsCount = issues.filter(i => i.type === "loop_detected").length;
  const chainsCount = issues.filter(i => i.type === "chain_detected").length;

  const ISSUE_LABELS: Record<string, string> = {
    loop_detected: "Loop erkannt",
    chain_detected: "Kette erkannt",
    duplicate_old_path: "Duplikat",
    missing_target: "Ziel fehlt",
    import_sku_not_found: "SKU nicht gefunden",
    import_old_path_conflict: "Import-Konflikt",
  };

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
            <h1 className="text-2xl font-heading font-bold">Redirect Monitoring</h1>
          </div>
          <div className="flex gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "30")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Letzte 7 Tage</SelectItem>
                <SelectItem value="30">Letzte 30 Tage</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link to="/admin">Zurück</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Hits ({period}d)</CardDescription>
                  <CardTitle className="text-3xl">{totalHits}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Redirects gesamt</CardDescription>
                  <CardTitle className="text-3xl">{redirectCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Aktive Redirects</CardDescription>
                  <CardTitle className="text-3xl">{activeCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Offene Issues</CardDescription>
                  <CardTitle className="text-3xl">{issues.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Loops / Ketten</CardDescription>
                  <CardTitle className="text-3xl">{loopsCount} / {chainsCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Hits Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Redirect Hits pro Tag</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Noch keine Hit-Daten vorhanden.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line type="monotone" dataKey="hits" className="stroke-primary" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Redirects */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Top Redirects</CardTitle>
                </CardHeader>
                <CardContent>
                  {topRedirects.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Keine Daten.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Alte URL</TableHead>
                          <TableHead>Neue URL</TableHead>
                          <TableHead className="text-right">Hits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topRedirects.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs break-all">{r.old_path}</TableCell>
                            <TableCell className="font-mono text-xs break-all">{r.new_path}</TableCell>
                            <TableCell className="text-right font-bold">{r.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Issues by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Issues nach Typ</CardTitle>
                  <CardDescription>
                    <Link to="/admin/301/conflicts" className="text-primary hover:underline text-sm">
                      Zum Konfliktzentrum →
                    </Link>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(issueSummary).length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Keine offenen Issues.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(issueSummary).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm">{ISSUE_LABELS[type] || type}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
