import { useState } from "react";
import { useConfiguratorGroups, useSaveGroup, useDeleteGroup, useGroupValues, useSaveValue, useDeleteValue } from "@/hooks/useConfigurator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { FIELD_TYPE_LABELS, type ConfiguratorGroup, type ConfiguratorFieldType, type ConfiguratorGroupValue } from "@/types/configurator";

export default function ConfiguratorGroups() {
  const { data: groups, isLoading } = useConfiguratorGroups();
  const deleteGroup = useDeleteGroup();
  const [editGroup, setEditGroup] = useState<ConfiguratorGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = groups?.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.internal_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGroup.mutateAsync(deleteId);
      toast.success("Gruppe gelöscht");
    } catch (e: any) {
      toast.error(e.message || "Fehler beim Löschen");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4 mr-2" />Neue Gruppe</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Gruppen vorhanden.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(g => (
            <Card key={g.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{g.name}{g.internal_name ? <span className="ml-2 text-xs text-muted-foreground font-normal">({g.internal_name})</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[g.field_type]} • {g.is_required ? 'Pflicht' : 'Optional'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditGroup(g)}><Pencil className="h-4 w-4 mr-1" />Bearbeiten</Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editGroup) && (
        <GroupEditorDialog group={editGroup} open onOpenChange={o => { if (!o) { setEditGroup(null); setCreating(false); } }} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>Die Gruppe und alle Werte werden unwiderruflich gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GroupEditorDialog({ group, open, onOpenChange }: { group: ConfiguratorGroup | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const saveGroup = useSaveGroup();
  const [currentGroup, setCurrentGroup] = useState<ConfiguratorGroup | null>(group);
  const [name, setName] = useState(group?.name || "");
  const [internalName, setInternalName] = useState(group?.internal_name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [fieldType, setFieldType] = useState<ConfiguratorFieldType>(group?.field_type || "dropdown_single");
  const [isRequired, setIsRequired] = useState(group?.is_required ?? true);
  const [sortOrder, setSortOrder] = useState(group?.sort_order ?? 0);

  const isNew = !currentGroup;
  const needsValues = fieldType !== 'text_input';

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name ist erforderlich"); return; }
    try {
      const saved = await saveGroup.mutateAsync({ id: currentGroup?.id, name, internal_name: internalName || null, description: description || null, field_type: fieldType, is_required: isRequired, sort_order: sortOrder });
      toast.success(currentGroup ? "Gruppe aktualisiert" : "Gruppe erstellt");
      if (!currentGroup && saved && needsValues) {
        // Stay open in edit mode so values can be added immediately
        setCurrentGroup(saved as ConfiguratorGroup);
      } else {
        onOpenChange(false);
      }
    } catch { toast.error("Fehler beim Speichern"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentGroup ? "Gruppe bearbeiten" : "Neue Gruppe"}</DialogTitle>
          <DialogDescription>Konfiguriere die Gruppeneinstellungen und verwalte die Werte.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name (öffentlich) *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Farbe" />
            </div>
            <div>
              <Label>Interner Name</Label>
              <Input value={internalName} onChange={e => setInternalName(e.target.value)} placeholder="z.B. Farbe Sattel XY" />
            </div>
          </div>
          <div>
            <Label>Feldtyp *</Label>
            <Select value={fieldType} onValueChange={v => setFieldType(v as ConfiguratorFieldType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" rows={2} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label>Pflichtfeld</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>Sortierung</Label>
              <Input type="number" className="w-20" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
            </div>
          </div>

          {/* Values section */}
          {fieldType === 'text_input' ? (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">Für Texteingabefelder werden keine Werte benötigt. Der Kunde kann frei Text eingeben.</p>
            </div>
          ) : currentGroup ? (
            <ValuesSection groupId={currentGroup.id} fieldType={fieldType} />
          ) : (
            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Werte</Label>
              <p className="text-sm text-muted-foreground mt-1">Speichere die Gruppe zuerst, um Werte hinzuzufügen.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          {currentGroup && !isNew && (
            <Button onClick={() => onOpenChange(false)} variant="outline">Schließen</Button>
          )}
          <Button onClick={handleSave} disabled={saveGroup.isPending}>
            {saveGroup.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isNew && needsValues ? 'Speichern & Werte hinzufügen' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValuesSection({ groupId, fieldType }: { groupId: string; fieldType: ConfiguratorFieldType }) {
  const { data: values, isLoading } = useGroupValues(groupId);
  const saveValue = useSaveValue();
  const deleteValue = useDeleteValue();
  const [editValue, setEditValue] = useState<ConfiguratorGroupValue | null>(null);
  const [creating, setCreating] = useState(false);

  const showImages = fieldType === 'image_single' || fieldType === 'image_multi';

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-base font-semibold">Werte</Label>
        <Button size="sm" variant="outline" onClick={() => setCreating(true)}><Plus className="h-3 w-3 mr-1" />Wert hinzufügen</Button>
      </div>
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <div className="space-y-1">
          {values?.map(v => (
            <div key={v.id} className="flex items-center gap-3 p-2 rounded border text-sm">
              {showImages && v.image_url && <img src={v.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="flex-1">{v.name}</span>
              <span className="text-muted-foreground">{v.price_delta > 0 ? `+${v.price_delta.toFixed(2)}` : v.price_delta < 0 ? v.price_delta.toFixed(2) : '0,00'} €</span>
              {!v.is_active && <span className="text-xs text-destructive">Inaktiv</span>}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditValue(v)}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                await deleteValue.mutateAsync({ id: v.id, groupId });
                toast.success("Wert gelöscht");
              }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
          {!values?.length && <p className="text-xs text-muted-foreground py-2">Noch keine Werte.</p>}
        </div>
      )}
      {(creating || editValue) && (
        <ValueEditorDialog value={editValue} groupId={groupId} showImage={showImages} open onOpenChange={o => { if (!o) { setEditValue(null); setCreating(false); } }} />
      )}
    </div>
  );
}

function ValueEditorDialog({ value, groupId, showImage, open, onOpenChange }: { value: ConfiguratorGroupValue | null; groupId: string; showImage: boolean; open: boolean; onOpenChange: (o: boolean) => void }) {
  const saveValue = useSaveValue();
  const [name, setName] = useState(value?.name || "");
  const [description, setDescription] = useState(value?.description || "");
  const [imageUrl, setImageUrl] = useState(value?.image_url || "");
  const [priceDelta, setPriceDelta] = useState(value?.price_delta?.toString() || "0");
  const [isActive, setIsActive] = useState(value?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(value?.sort_order ?? 0);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name ist erforderlich"); return; }
    try {
      await saveValue.mutateAsync({
        id: value?.id, group_id: groupId, name, description: description || null,
        image_url: imageUrl || null, price_delta: parseFloat(priceDelta) || 0,
        sort_order: sortOrder, is_active: isActive,
      });
      toast.success(value ? "Wert aktualisiert" : "Wert erstellt");
      onOpenChange(false);
    } catch { toast.error("Fehler"); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value ? "Wert bearbeiten" : "Neuer Wert"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Beschreibung</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
          {showImage && <div><Label>Bild-URL</Label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" /></div>}
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Aufpreis (€)</Label><Input type="number" step="0.01" value={priceDelta} onChange={e => setPriceDelta(e.target.value)} /></div>
            <div><Label>Sortierung</Label><Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Aktiv</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saveValue.isPending}>
            {saveValue.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
