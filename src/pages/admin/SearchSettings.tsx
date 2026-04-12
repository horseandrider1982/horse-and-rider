import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, X, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SearchLogTable = lazy(() => import("@/components/admin/SearchLogTable"));

interface Synonym {
  id: string;
  term: string;
  synonyms: string[];
  is_active: boolean;
}

export default function SearchSettings() {
  const [synonyms, setSynonyms] = useState<Synonym[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTerm, setNewTerm] = useState("");
  const [newSynonyms, setNewSynonyms] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSynonyms, setEditSynonyms] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSynonyms = async () => {
    const { data, error } = await supabase
      .from("search_synonyms")
      .select("*")
      .order("term");
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSynonyms((data as Synonym[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSynonyms(); }, []);

  const handleAdd = async () => {
    const term = newTerm.trim().toLowerCase();
    const syns = newSynonyms.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!term || syns.length === 0) {
      toast({ title: "Bitte Term und mindestens ein Synonym eingeben." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("search_synonyms").insert({ term, synonyms: syns });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Synonym hinzugefügt" });
      setNewTerm("");
      setNewSynonyms("");
      fetchSynonyms();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("search_synonyms").delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSynonyms(prev => prev.filter(s => s.id !== id));
      toast({ title: "Gelöscht" });
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("search_synonyms").update({ is_active: !current }).eq("id", id);
    setSynonyms(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
  };

  const startEdit = (syn: Synonym) => {
    setEditingId(syn.id);
    setEditSynonyms(syn.synonyms.join(", "));
  };

  const saveEdit = async (id: string) => {
    const syns = editSynonyms.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const { error } = await supabase.from("search_synonyms").update({ synonyms: syns }).eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSynonyms(prev => prev.map(s => s.id === id ? { ...s, synonyms: syns } : s));
      setEditingId(null);
      toast({ title: "Gespeichert" });
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">Such-Einstellungen</h1>

      {/* Add new synonym */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Neues Synonym hinzufügen</CardTitle>
          <CardDescription>
            Gib einen Suchbegriff und kommagetrennte Synonyme ein, z.B. Term: "decke", Synonyme: "pferdedecke, regendecke, winterdecke"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Suchbegriff (Term)"
              value={newTerm}
              onChange={e => setNewTerm(e.target.value)}
              className="sm:w-48"
            />
            <Input
              placeholder="Synonyme (kommagetrennt)"
              value={newSynonyms}
              onChange={e => setNewSynonyms(e.target.value)}
              className="flex-1"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={saving} className="shrink-0">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Synonym list */}
      <Card>
        <CardHeader>
          <CardTitle>Synonyme ({synonyms.length})</CardTitle>
          <CardDescription>Verwalte Suchbegriff-Zuordnungen. Klicke auf die Synonyme zum Bearbeiten.</CardDescription>
        </CardHeader>
        <CardContent>
          {synonyms.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Noch keine Synonyme angelegt.</p>
          ) : (
            <div className="space-y-3">
              {synonyms.map(syn => (
                <div
                  key={syn.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${syn.is_active ? "bg-background" : "bg-muted/50 opacity-60"}`}
                >
                  <button
                    onClick={() => handleToggle(syn.id, syn.is_active)}
                    className={`shrink-0 w-2.5 h-2.5 rounded-full ${syn.is_active ? "bg-green-500" : "bg-muted-foreground"}`}
                    title={syn.is_active ? "Aktiv – klicken zum Deaktivieren" : "Inaktiv – klicken zum Aktivieren"}
                  />

                  <span className="font-medium text-sm shrink-0 w-32 truncate" title={syn.term}>
                    {syn.term}
                  </span>

                  <span className="text-muted-foreground text-sm shrink-0">→</span>

                  {editingId === syn.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editSynonyms}
                        onChange={e => setEditSynonyms(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        onKeyDown={e => e.key === "Enter" && saveEdit(syn.id)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(syn.id)}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-wrap gap-1 cursor-pointer" onClick={() => startEdit(syn)}>
                      {syn.synonyms.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <Button size="sm" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={() => handleDelete(syn.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Logs */}
      <div className="mt-8">
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
          <SearchLogTable />
        </Suspense>
      </div>
    </>
  );
}
