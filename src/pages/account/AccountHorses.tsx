import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { Loader2, Plus, PawPrint, Pencil, Trash2, ArrowLeft } from "lucide-react";

interface Horse {
  id: string;
  name: string;
  breed: string | null;
  color: string | null;
  height_cm: number | null;
  birth_year: number | null;
  discipline: string | null;
  training_level: number | null;
  notes: string | null;
}

type ViewMode = "list" | "new" | "detail" | "edit";

const DISCIPLINE_OPTIONS = [
  "Dressur", "Springen", "Vielseitigkeit", "Island",
  "Western", "Barock", "Freizeitpferd", "Sonstiges",
];

const emptyForm = {
  name: "", breed: "", color: "", height_cm: "",
  birth_year: "", discipline: "", training_level: "", notes: "",
};

export default function AccountHorses() {
  usePageMeta({ title: "Meine Pferde", description: "Verwalten Sie Ihre Pferdeprofile.", noIndex: true });

  const { customer } = useShopifyCustomer();
  const { localePath } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [form, setForm] = useState(emptyForm);

  const customerEmail = customer?.email;

  // Determine view mode from URL
  const getViewMode = (): ViewMode => {
    const path = location.pathname;
    if (path.endsWith("/neu")) return "new";
    if (path.endsWith("/bearbeiten")) return "edit";
    if (params.id) return "detail";
    return "list";
  };
  const viewMode = getViewMode();

  // Call the sync-horses edge function
  const callSync = async (action: string, horse?: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("sync-horses", {
      body: { action, email: customerEmail, horse },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadHorses = async () => {
    if (!customerEmail) { setLoading(false); return; }
    try {
      const result = await callSync("list");
      setHorses(result.data || []);
    } catch (err) {
      console.error("Failed to load horses:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadHorses(); }, [customerEmail]);

  // Load selected horse for detail/edit
  useEffect(() => {
    if ((viewMode === "detail" || viewMode === "edit") && params.id) {
      const horse = horses.find(h => h.id === params.id);
      if (horse) {
        setSelectedHorse(horse);
        if (viewMode === "edit") {
          setForm({
            name: horse.name,
            breed: horse.breed || "",
            color: horse.color || "",
            height_cm: horse.height_cm?.toString() || "",
            birth_year: horse.birth_year?.toString() || "",
            discipline: horse.discipline || "",
            training_level: horse.training_level?.toString() || "",
            notes: horse.notes || "",
          });
        }
      }
    }
    if (viewMode === "new") setForm(emptyForm);
  }, [viewMode, params.id, horses]);

  const handleSave = async () => {
    if (!customerEmail || !form.name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein.");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      breed: form.breed.trim() || null,
      color: form.color.trim() || null,
      height_cm: form.height_cm ? parseInt(form.height_cm) : null,
      birth_year: form.birth_year ? parseInt(form.birth_year) : null,
      discipline: form.discipline || null,
      training_level: form.training_level ? parseInt(form.training_level) : null,
    };

    try {
      if (viewMode === "edit" && params.id) {
        payload.id = params.id;
        await callSync("update", payload);
        toast.success("Pferd aktualisiert.");
        await loadHorses();
        navigate(localePath(`/pferde/${params.id}`));
      } else {
        await callSync("create", payload);
        toast.success("Pferd angelegt!");
        await loadHorses();
        navigate(localePath("/pferde"));
      }
    } catch (err: any) {
      toast.error(err.message || "Fehler beim Speichern.");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Möchten Sie dieses Pferd wirklich löschen?")) return;
    try {
      await callSync("delete", { id });
      toast.success("Pferd gelöscht.");
      await loadHorses();
      navigate(localePath("/pferde"));
    } catch {
      toast.error("Fehler beim Löschen.");
    }
  };

  // --- FORM ---
  const renderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle>{viewMode === "new" ? "Neues Pferd anlegen" : "Pferd bearbeiten"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="horse-name">Name *</Label>
            <Input id="horse-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Luna" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horse-breed">Rasse</Label>
            <Input id="horse-breed" value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))} placeholder="z.B. Hannoveraner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horse-color">Farbe</Label>
            <Input id="horse-color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="z.B. Fuchs" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horse-height">Stockmaß (cm)</Label>
            <Input id="horse-height" type="number" value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} placeholder="z.B. 168" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horse-year">Geburtsjahr</Label>
            <Input id="horse-year" type="number" value={form.birth_year} onChange={e => setForm(f => ({ ...f, birth_year: e.target.value }))} placeholder="z.B. 2018" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="horse-training">Ausbildungsstand (1-10)</Label>
            <Input id="horse-training" type="number" min={1} max={10} value={form.training_level} onChange={e => setForm(f => ({ ...f, training_level: e.target.value }))} placeholder="z.B. 5" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Disziplin</Label>
          <Select value={form.discipline} onValueChange={v => setForm(f => ({ ...f, discipline: v }))}>
            <SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
            <SelectContent>
              {DISCIPLINE_OPTIONS.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="horse-notes">Notizen</Label>
          <Textarea id="horse-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Besonderheiten, Maße für Ausrüstung..." rows={3} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {viewMode === "new" ? "Anlegen" : "Speichern"}
          </Button>
          <Button variant="outline" onClick={() => navigate(localePath("/pferde"))}>Abbrechen</Button>
        </div>
      </CardContent>
    </Card>
  );

  // --- DETAIL ---
  const renderDetail = () => {
    if (!selectedHorse) return null;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              {selectedHorse.name}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate(localePath(`/pferde/${selectedHorse.id}/bearbeiten`))}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Bearbeiten
              </Button>
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleDelete(selectedHorse.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {selectedHorse.breed && <div><dt className="text-muted-foreground">Rasse</dt><dd className="font-medium">{selectedHorse.breed}</dd></div>}
            {selectedHorse.color && <div><dt className="text-muted-foreground">Farbe</dt><dd className="font-medium">{selectedHorse.color}</dd></div>}
            {selectedHorse.height_cm && <div><dt className="text-muted-foreground">Stockmaß</dt><dd className="font-medium">{selectedHorse.height_cm} cm</dd></div>}
            {selectedHorse.birth_year && <div><dt className="text-muted-foreground">Geburtsjahr</dt><dd className="font-medium">{selectedHorse.birth_year}</dd></div>}
            {selectedHorse.discipline && <div><dt className="text-muted-foreground">Disziplin</dt><dd className="font-medium">{selectedHorse.discipline}</dd></div>}
            {selectedHorse.training_level && <div><dt className="text-muted-foreground">Ausbildung</dt><dd className="font-medium">{selectedHorse.training_level}/10</dd></div>}
          </dl>
          {selectedHorse.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground mb-1">Notizen</p>
              <p className="text-sm">{selectedHorse.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // --- LIST ---
  const renderList = () => (
    <>
      {horses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Noch keine Pferde</CardTitle>
            <CardDescription>Legen Sie Ihr erstes Pferd an, um Maße und Informationen für die perfekte Ausrüstung zu speichern.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(localePath("/pferde/neu"))}>
              <Plus className="h-4 w-4 mr-2" /> Pferd anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {horses.map(horse => (
            <Card key={horse.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate(localePath(`/pferde/${horse.id}`))}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <PawPrint className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{horse.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {[horse.breed, horse.color, horse.height_cm && `${horse.height_cm} cm`, horse.discipline].filter(Boolean).join(" · ") || "Keine Details"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );

  return (
    <AccountLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {viewMode !== "list" && (
            <Button variant="ghost" size="sm" onClick={() => navigate(localePath("/pferde"))} className="mr-auto">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Zurück
            </Button>
          )}
          <h1 className="text-2xl font-heading font-bold">
            {viewMode === "list" ? "Meine Pferde" : viewMode === "new" ? "Neues Pferd" : selectedHorse?.name || "Pferd"}
          </h1>
          {viewMode === "list" && horses.length > 0 && (
            <Button size="sm" onClick={() => navigate(localePath("/pferde/neu"))}>
              <Plus className="h-4 w-4 mr-1.5" /> Hinzufügen
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "list" ? renderList()
          : viewMode === "new" || viewMode === "edit" ? renderForm()
          : viewMode === "detail" ? renderDetail()
          : null}
      </div>
    </AccountLayout>
  );
}
