import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SearchLogEntry {
  query: string;
  count: number;
  avg_results: number;
  zero_results_count: number;
  last_searched: string;
}

export default function SearchLogTable() {
  const [logs, setLogs] = useState<SearchLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showZeroOnly, setShowZeroOnly] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    // Get aggregated search logs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("search_logs")
      .select("query, result_count, searched_at")
      .gte("searched_at", thirtyDaysAgo.toISOString())
      .order("searched_at", { ascending: false });

    if (error) {
      console.error("Error fetching search logs:", error);
      setLoading(false);
      return;
    }

    // Aggregate client-side
    const aggregated = new Map<string, { count: number; totalResults: number; zeroCount: number; lastSearched: string }>();
    for (const row of data || []) {
      const key = row.query.toLowerCase().trim();
      const existing = aggregated.get(key);
      if (existing) {
        existing.count++;
        existing.totalResults += row.result_count;
        if (row.result_count === 0) existing.zeroCount++;
        if (row.searched_at > existing.lastSearched) existing.lastSearched = row.searched_at;
      } else {
        aggregated.set(key, {
          count: 1,
          totalResults: row.result_count,
          zeroCount: row.result_count === 0 ? 1 : 0,
          lastSearched: row.searched_at,
        });
      }
    }

    const entries: SearchLogEntry[] = [...aggregated.entries()]
      .map(([query, data]) => ({
        query,
        count: data.count,
        avg_results: Math.round(data.totalResults / data.count),
        zero_results_count: data.zeroCount,
        last_searched: data.lastSearched,
      }))
      .sort((a, b) => b.count - a.count);

    setLogs(entries);
    setLoading(false);
  };

  const filtered = showZeroOnly ? logs.filter(l => l.zero_results_count > 0) : logs;
  const totalSearches = logs.reduce((s, l) => s + l.count, 0);
  const totalZero = logs.reduce((s, l) => s + l.zero_results_count, 0);
  const uniqueQueries = logs.length;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Suchprotokoll (letzte 30 Tage)
        </CardTitle>
        <CardDescription>
          Übersicht aller Suchanfragen und deren Ergebnisanzahl
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-background">
            <div className="text-2xl font-bold">{totalSearches}</div>
            <div className="text-sm text-muted-foreground">Suchanfragen gesamt</div>
          </div>
          <div className="p-4 rounded-lg border bg-background">
            <div className="text-2xl font-bold">{uniqueQueries}</div>
            <div className="text-sm text-muted-foreground">Unique Suchbegriffe</div>
          </div>
          <div className="p-4 rounded-lg border bg-background">
            <div className="text-2xl font-bold text-destructive">{totalZero}</div>
            <div className="text-sm text-muted-foreground">Ohne Ergebnis</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={showZeroOnly ? "default" : "outline"}
            onClick={() => setShowZeroOnly(!showZeroOnly)}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Nur ohne Ergebnis ({totalZero})
          </Button>
          <Button size="sm" variant="outline" onClick={fetchLogs}>
            Aktualisieren
          </Button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            {showZeroOnly ? "Keine Suchanfragen ohne Ergebnis." : "Noch keine Suchanfragen protokolliert."}
          </p>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Suchbegriff</TableHead>
                  <TableHead className="text-right w-24">Anfragen</TableHead>
                  <TableHead className="text-right w-32">Ø Ergebnisse</TableHead>
                  <TableHead className="text-right w-32">Ohne Ergebnis</TableHead>
                  <TableHead className="w-40">Zuletzt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.query}>
                    <TableCell className="font-medium">
                      {entry.query}
                      {entry.count >= 5 && (
                        <TrendingUp className="inline h-3.5 w-3.5 ml-1.5 text-primary" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{entry.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={entry.avg_results === 0 ? "text-destructive font-medium" : ""}>
                        {entry.avg_results}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.zero_results_count > 0 ? (
                        <Badge variant="destructive">{entry.zero_results_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(entry.last_searched)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
