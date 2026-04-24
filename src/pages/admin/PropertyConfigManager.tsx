import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePropertyConfigsAdmin, type PropertyDisplayConfig } from "@/hooks/usePropertyConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles, Trash2, Upload, GripVertical, ImageOff } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function PropertyConfigManager() {
  const qc = useQueryClient();
  const { data: configs, isLoading } = usePropertyConfigsAdmin();
  const [discovering, setDiscovering] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const { data, error } = await supabase.functions.invoke("discover-xentral-props");
      if (error) throw error;
      toast.success(
        `Synchronisiert: ${data?.discovered ?? 0} Eigenschaften gefunden, ${data?.inserted ?? 0} neu hinzugefügt.`,
      );
      qc.invalidateQueries({ queryKey: ["property-configs-admin"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Synchronisation fehlgeschlagen");
    } finally {
      setDiscovering(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !configs) return;
    const oldIndex = configs.findIndex((c) => c.id === active.id);
    const newIndex = configs.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(configs, oldIndex, newIndex);

    // Optimistic update
    qc.setQueryData(["property-configs-admin"], reordered);

    try {
      // Persist new display_order for all affected rows
      const updates = reordered.map((c, idx) => ({ id: c.id, display_order: idx + 1 }));
      // Update individually to avoid upsert needing full row data
      await Promise.all(
        updates.map((u) =>
          supabase
            .from("product_property_display_config")
            .update({ display_order: u.display_order })
            .eq("id", u.id),
        ),
      );
      qc.invalidateQueries({ queryKey: ["property-configs-admin"] });
      qc.invalidateQueries({ queryKey: ["property-configs-active"] });
    } catch (err) {
      toast.error("Sortierung konnte nicht gespeichert werden");
      qc.invalidateQueries({ queryKey: ["property-configs-admin"] });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Produkt-Eigenschaften</CardTitle>
          <CardDescription>
            Eigenschaften aus dem Shopify-Namespace <code className="text-xs">xentral_props</code>{" "}
            verwalten. Aktive Einträge werden auf der Produktdetailseite angezeigt.
          </CardDescription>
        </div>
        <Button onClick={handleDiscover} disabled={discovering} variant="outline">
          {discovering ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Aus Shopify synchronisieren
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !configs || configs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-3">Noch keine Eigenschaften vorhanden.</p>
            <p className="text-sm">
              Klicke auf <strong>„Aus Shopify synchronisieren"</strong>, um die im Namespace{" "}
              <code>xentral_props</code> definierten Metafields zu importieren.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={configs.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {configs.map((config) => (
                  <PropertyRow key={config.id} config={config} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

function PropertyRow({ config }: { config: PropertyDisplayConfig }) {
  const qc = useQueryClient();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: config.id,
  });
  const [label, setLabel] = useState(config.label);
  const [savingLabel, setSavingLabel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["property-configs-admin"] });
    qc.invalidateQueries({ queryKey: ["property-configs-active"] });
  };

  const handleToggleActive = async (next: boolean) => {
    const { error } = await supabase
      .from("product_property_display_config")
      .update({ is_active: next })
      .eq("id", config.id);
    if (error) {
      toast.error("Konnte Status nicht ändern");
      return;
    }
    refresh();
  };

  const handleSaveLabel = async () => {
    if (label === config.label) return;
    setSavingLabel(true);
    const { error } = await supabase
      .from("product_property_display_config")
      .update({ label })
      .eq("id", config.id);
    setSavingLabel(false);
    if (error) {
      toast.error("Anzeigename konnte nicht gespeichert werden");
      return;
    }
    toast.success("Anzeigename gespeichert");
    refresh();
  };

  const handleGenerateIcon = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-property-icon", {
        body: { configId: config.id, key: config.shopify_key, label: config.label },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      toast.success("Icon generiert");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Icon-Generierung fehlgeschlagen");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteIcon = async () => {
    if (!config.icon_url) return;
    if (!confirm("Icon wirklich entfernen?")) return;

    // Try to delete file in storage if it lives there
    try {
      const url = new URL(config.icon_url);
      const marker = "/storage/v1/object/public/property-icons/";
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        const path = url.pathname.slice(idx + marker.length);
        await supabase.storage.from("property-icons").remove([path]);
      }
    } catch {
      // ignore – still clear DB column
    }

    const { error } = await supabase
      .from("product_property_display_config")
      .update({ icon_url: null })
      .eq("id", config.id);
    if (error) {
      toast.error("Konnte Icon nicht löschen");
      return;
    }
    toast.success("Icon entfernt");
    refresh();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine Bilddatei hochladen (SVG/PNG)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${config.shopify_key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("property-icons")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("property-icons").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("product_property_display_config")
        .update({ icon_url: pub.publicUrl, icon_generated_at: new Date().toISOString() })
        .eq("id", config.id);
      if (dbErr) throw dbErr;
      toast.success("Icon hochgeladen");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
    >
      <button
        type="button"
        className="touch-none cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Zum Sortieren ziehen"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <Switch checked={config.is_active} onCheckedChange={handleToggleActive} />

      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {config.icon_url ? (
          <img src={config.icon_url} alt={config.label} className="w-full h-full object-contain p-1" />
        ) : (
          <ImageOff className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Key</div>
          <code className="text-sm">{config.shopify_key}</code>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Anzeigename</div>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleSaveLabel}
            disabled={savingLabel}
            className="h-8"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerateIcon}
          disabled={generating}
          title="Icon mit KI generieren"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        </Button>
        <label
          className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
          title="Icon hochladen"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <input
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        {config.icon_url && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteIcon}
            title="Icon löschen"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
