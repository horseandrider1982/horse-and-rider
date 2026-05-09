import { useState, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Save, Search } from "lucide-react";
import {
  useDownloadCategories,
  useDownloadsByCategory,
  useDeleteDownload,
  useUpdateDownload,
  extractSkuFromFilename,
  type DownloadCategory,
  type ProductDownload,
} from "@/hooks/useProductDownloads";

const BUCKET = "product-downloads";

export default function DownloadsManager() {
  const { data: categories, isLoading } = useDownloadCategories();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!categories || categories.length === 0) {
    return <p className="text-muted-foreground">Keine Kategorien vorhanden.</p>;
  }

  return (
    <Tabs defaultValue={categories[0].key} className="space-y-4">
      <TabsList className="flex-wrap h-auto">
        {categories.map((c) => (
          <TabsTrigger key={c.key} value={c.key}>{c.label}</TabsTrigger>
        ))}
      </TabsList>
      {categories.map((c) => (
        <TabsContent key={c.key} value={c.key}>
          <CategoryPanel category={c} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function CategoryPanel({ category }: { category: DownloadCategory }) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useDownloadsByCategory(category.key);
  const deleteMut = useDeleteDownload();
  const updateMut = useUpdateDownload();

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Record<string, { sku: string }>>({});

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.sku.toLowerCase().includes(q) ||
        i.display_filename.toLowerCase().includes(q) ||
        i.original_filename.toLowerCase().includes(q),
    );
  }, [items, filter]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let inserted = 0;
    let failed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const sku = extractSkuFromFilename(file.name).toLowerCase();
          if (!sku) {
            failed++;
            continue;
          }
          // Determine running number for this (category, sku) pair
          const { count } = await supabase
            .from("product_downloads")
            .select("id", { count: "exact", head: true })
            .eq("category_key", category.key)
            .eq("sku", sku);
          const running = (count ?? 0) + 1;
          const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
          const safeCat = category.key.replace(/[^a-z0-9_-]/gi, "");
          const safeSku = sku.replace(/[^a-z0-9_-]/gi, "");
          const displayName = `${prettyCategory(category.label)}_${sku}_${running}${ext}`;
          const storagePath = `${safeCat}/${safeSku}/${Date.now()}_${running}${ext}`;

          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

          const { error: insErr } = await supabase.from("product_downloads").insert({
            category_key: category.key,
            sku,
            original_filename: file.name,
            display_filename: displayName,
            storage_path: storagePath,
            public_url: pub.publicUrl,
            file_size_bytes: file.size,
            sort_order: running,
          });
          if (insErr) throw insErr;

          inserted++;
        } catch (err) {
          console.error("[downloads] upload failed", file.name, err);
          failed++;
        } finally {
          setProgress({ done: i + 1, total: files.length });
        }
      }
      qc.invalidateQueries({ queryKey: ["product-downloads-cat", category.key] });
      qc.invalidateQueries({ queryKey: ["product-downloads-skus"] });
      toast.success(`${inserted} hochgeladen${failed ? `, ${failed} fehlgeschlagen` : ""}`);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSaveEdit = async (item: ProductDownload) => {
    const e = editing[item.id];
    if (!e) return;
    const newSku = e.sku.trim().toLowerCase();
    if (!newSku) {
      toast.error("Artikelnummer darf nicht leer sein");
      return;
    }
    const ext = item.display_filename.includes(".")
      ? item.display_filename.substring(item.display_filename.lastIndexOf("."))
      : "";
    const newDisplay = `${prettyCategory(category.label)}_${newSku}_${item.sort_order}${ext}`;
    await updateMut.mutateAsync({ id: item.id, sku: newSku, display_filename: newDisplay });
    toast.success("Aktualisiert");
    setEditing((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  const handleDelete = async (item: ProductDownload) => {
    await deleteMut.mutateAsync(item);
    toast.success("Datei gelöscht");
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            PDFs hier hochladen. Der <strong>Dateiname</strong> muss die Artikelnummer enthalten
            (z.B. <code>ABC123.pdf</code> oder <code>ABC123_2.pdf</code>).
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Anzeigename wird automatisch vergeben: <code>{prettyCategory(category.label)}_&lt;Artikelnr&gt;_n.pdf</code>
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {progress ? `${progress.done}/${progress.total}` : "Lädt..."}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Dateien wählen
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nach Artikelnummer oder Dateiname filtern…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Noch keine Dateien in dieser Kategorie.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artikelnummer</TableHead>
                <TableHead>Anzeigename</TableHead>
                <TableHead>Original</TableHead>
                <TableHead className="w-[80px]">Größe</TableHead>
                <TableHead className="w-[180px] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isEditing = editing[item.id] !== undefined;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editing[item.id].sku}
                          onChange={(e) =>
                            setEditing((p) => ({ ...p, [item.id]: { sku: e.target.value } }))
                          }
                          className="h-8"
                        />
                      ) : (
                        <code className="text-sm">{item.sku}</code>
                      )}
                    </TableCell>
                    <TableCell>
                      <a href={item.public_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                        {item.display_filename}
                      </a>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.original_filename}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.file_size_bytes ? `${Math.round(item.file_size_bytes / 1024)} KB` : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(item)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setEditing((p) => {
                                const n = { ...p };
                                delete n[item.id];
                                return n;
                              })
                            }
                          >
                            Abbrechen
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing((p) => ({ ...p, [item.id]: { sku: item.sku } }))}
                          >
                            Bearbeiten
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Datei löschen?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  „{item.display_filename}“ wird unwiderruflich gelöscht.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item)}>
                                  Löschen
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function prettyCategory(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, "");
}
