import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, Save, Search, Tags, Plus, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { storefrontApiRequest, STOREFRONT_PAGINATED_QUERY, type ShopifyProduct } from "@/lib/shopify";
import {
  useDownloadCategories,
  useDownloadsByCategory,
  useDeleteDownload,
  useUpdateDownload,
  useAssignmentsForDownloads,
  useReplaceAssignments,
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
  const [editTitleId, setEditTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [assignFor, setAssignFor] = useState<ProductDownload | null>(null);

  const downloadIds = useMemo(() => (items ?? []).map((i) => i.id), [items]);
  const { data: assignments } = useAssignmentsForDownloads(downloadIds);

  const skusByDownload = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assignments ?? []) {
      const arr = m.get(a.download_id) ?? [];
      arr.push(a.sku);
      m.set(a.download_id, arr);
    }
    return m;
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const skus = skusByDownload.get(i.id) ?? [];
      return (
        (i.title ?? "").toLowerCase().includes(q) ||
        i.display_filename.toLowerCase().includes(q) ||
        i.original_filename.toLowerCase().includes(q) ||
        skus.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [items, filter, skusByDownload]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length });
    let inserted = 0;
    let failed = 0;

    try {
      const { count: existingCount } = await supabase
        .from("product_downloads")
        .select("id", { count: "exact", head: true })
        .eq("category_key", category.key);
      let running = (existingCount ?? 0) + 1;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const ext = file.name.includes(".") ? file.name.substring(file.name.lastIndexOf(".")) : "";
          const safeCat = category.key.replace(/[^a-z0-9_-]/gi, "");
          const displayName = `${prettyCategory(category.label)}_${running}${ext}`;
          const storagePath = `${safeCat}/${Date.now()}_${running}${ext}`;

          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (upErr) throw upErr;

          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

          const { error: insErr } = await supabase.from("product_downloads").insert({
            category_key: category.key,
            sku: null,
            title: file.name.replace(/\.[^.]+$/, ""),
            original_filename: file.name,
            display_filename: displayName,
            storage_path: storagePath,
            public_url: pub.publicUrl,
            file_size_bytes: file.size,
            sort_order: running,
          });
          if (insErr) throw insErr;

          inserted++;
          running++;
        } catch (err) {
          console.error("[downloads] upload failed", file.name, err);
          failed++;
        } finally {
          setProgress({ done: i + 1, total: files.length });
        }
      }
      qc.invalidateQueries({ queryKey: ["product-downloads-cat", category.key] });
      qc.invalidateQueries({ queryKey: ["product-downloads-for-skus"] });
      toast.success(`${inserted} hochgeladen${failed ? `, ${failed} fehlgeschlagen` : ""}`);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSaveTitle = async (item: ProductDownload) => {
    const newTitle = titleDraft.trim();
    await updateMut.mutateAsync({ id: item.id, title: newTitle || null });
    toast.success("Aktualisiert");
    setEditTitleId(null);
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
            Beliebige PDF-Dateien hochladen. Artikel werden anschließend pro Datei zugeordnet.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Anzeigename automatisch: <code>{prettyCategory(category.label)}_n.pdf</code> (manuell anpassbar)
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
            placeholder="Nach Titel, Dateiname oder Artikelnummer filtern…"
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
                <TableHead>Titel / Datei</TableHead>
                <TableHead>Zugeordnete Artikel</TableHead>
                <TableHead className="w-[80px]">Größe</TableHead>
                <TableHead className="w-[200px] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const skus = skusByDownload.get(item.id) ?? [];
                const isEditingTitle = editTitleId === item.id;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      {isEditingTitle ? (
                        <div className="flex gap-1">
                          <Input
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            className="h-8"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleSaveTitle(item)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditTitleId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            className="text-sm font-medium text-foreground hover:text-primary text-left"
                            onClick={() => {
                              setEditTitleId(item.id);
                              setTitleDraft(item.title ?? "");
                            }}
                            title="Titel bearbeiten"
                          >
                            {item.title || item.display_filename}
                          </button>
                          <a
                            href={item.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-muted-foreground hover:underline"
                          >
                            {item.original_filename}
                          </a>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {skus.length === 0 ? (
                        <span className="text-xs text-muted-foreground">— keine —</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {skus.slice(0, 8).map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>
                          ))}
                          {skus.length > 8 && (
                            <Badge variant="outline" className="text-xs">+{skus.length - 8}</Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground align-top">
                      {item.file_size_bytes ? `${Math.round(item.file_size_bytes / 1024)} KB` : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1 align-top">
                      <Button size="sm" variant="outline" onClick={() => setAssignFor(item)}>
                        <Tags className="h-3.5 w-3.5 mr-1" /> Artikel
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
                              „{item.title || item.display_filename}“ und alle Zuordnungen werden gelöscht.
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {assignFor && (
          <AssignDialog
            download={assignFor}
            initialSkus={skusByDownload.get(assignFor.id) ?? []}
            onClose={() => setAssignFor(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}

function prettyCategory(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, "");
}

function parseProductSearchTerms(input: string): string[] {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0 && !/^(and|or|not|und|oder)$/i.test(term));
}

function productMatchesSearchTerms(product: ShopifyProduct, terms: string[]): boolean {
  if (terms.length === 0) return true;

  const searchable = [
    product.node.title,
    product.node.vendor,
    product.node.productType,
    ...(product.node.tags ?? []),
    ...((product.node.variants?.edges ?? []).flatMap((variant) => [variant.node.title, variant.node.sku, variant.node.barcode])),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return terms.every((term) => searchable.includes(term));
}

async function searchProductsForAssignments(query: string, language: string): Promise<ShopifyProduct[]> {
  const terms = parseProductSearchTerms(query);
  const candidates = Array.from(new Set([query.trim(), ...terms])).filter(Boolean);
  const byHandle = new Map<string, ShopifyProduct>();

  for (const candidate of candidates) {
    let cursor: string | null = null;
    let hasNext = true;
    let pages = 0;
    while (hasNext && pages < 3) {
      const variables: Record<string, unknown> = { first: 100, language, query: candidate };
      if (cursor) variables.after = cursor;
      const data = await storefrontApiRequest(STOREFRONT_PAGINATED_QUERY, variables);
      const products = data?.data?.products;
      if (!products) break;
      for (const product of products.edges as ShopifyProduct[]) {
        byHandle.set(product.node.handle, product);
      }
      hasNext = products.pageInfo.hasNextPage;
      cursor = products.pageInfo.endCursor;
      pages++;
    }
  }

  return Array.from(byHandle.values()).filter((product) => productMatchesSearchTerms(product, terms));
}

// =====================================================================
// Assignment dialog: search Shopify products, multi-select → variant SKUs
// =====================================================================

function AssignDialog({
  download,
  initialSkus,
  onClose,
}: {
  download: ProductDownload;
  initialSkus: string[];
  onClose: () => void;
}) {
  const replaceMut = useReplaceAssignments();
  const { shopifyLanguage } = useI18n();
  const [skus, setSkus] = useState<string[]>(() =>
    Array.from(new Set(initialSkus.map((s) => s.toLowerCase())))
  );
  const [manualSku, setManualSku] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: products, isFetching } = useQuery({
    queryKey: ["downloads-product-search", debounced, shopifyLanguage],
    enabled: debounced.length >= 2,
    queryFn: async () => {
      const all: ShopifyProduct[] = [];
      let cursor: string | null = null;
      let hasNext = true;
      let pages = 0;
      while (hasNext && pages < 3) {
        const variables: Record<string, unknown> = { first: 50, language: shopifyLanguage, query: debounced };
        if (cursor) variables.after = cursor;
        const data = await storefrontApiRequest(STOREFRONT_PAGINATED_QUERY, variables);
        const p = data?.data?.products;
        if (!p) break;
        all.push(...(p.edges as ShopifyProduct[]));
        hasNext = p.pageInfo.hasNextPage;
        cursor = p.pageInfo.endCursor;
        pages++;
      }
      return all;
    },
    staleTime: 60_000,
  });

  const skuSet = useMemo(() => new Set(skus.map((s) => s.toLowerCase())), [skus]);

  const addSkus = (incoming: string[]) => {
    const clean = incoming.map((s) => s.trim().toLowerCase()).filter(Boolean);
    setSkus((prev) => Array.from(new Set([...prev, ...clean])));
  };

  const removeSku = (sku: string) =>
    setSkus((prev) => prev.filter((s) => s.toLowerCase() !== sku.toLowerCase()));

  const handleAddManual = () => {
    if (!manualSku.trim()) return;
    addSkus(manualSku.split(/[,;\s]+/));
    setManualSku("");
  };

  const handleSave = async () => {
    await replaceMut.mutateAsync({ downloadId: download.id, skus });
    toast.success(`${skus.length} Artikel zugeordnet`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Artikel zuordnen</DialogTitle>
          <DialogDescription>
            {download.title || download.display_filename}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Selected SKUs */}
          <div>
            <p className="text-sm font-medium mb-2">
              Zugeordnete Artikelnummern ({skus.length})
            </p>
            {skus.length === 0 ? (
              <p className="text-xs text-muted-foreground">Noch keine zugeordnet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-border rounded-md">
                {skus.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono text-xs gap-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSku(s)}
                      className="hover:text-destructive"
                      aria-label={`${s} entfernen`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Manual SKU input */}
          <div>
            <p className="text-sm font-medium mb-2">Artikelnummer manuell hinzufügen</p>
            <div className="flex gap-2">
              <Input
                placeholder="z. B. ABC123, XYZ-9 …"
                value={manualSku}
                onChange={(e) => setManualSku(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddManual();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddManual}>
                <Plus className="h-4 w-4 mr-1" /> Hinzufügen
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mehrere Werte mit Komma oder Leerzeichen trennen.
            </p>
          </div>

          {/* Product search */}
          <div>
            <p className="text-sm font-medium mb-2">Produkt suchen (Mehrfachauswahl)</p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Produktname, Marke, Artikelnummer…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border border-border rounded-md max-h-72 overflow-y-auto">
              {debounced.length < 2 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">Mind. 2 Zeichen eingeben…</p>
              ) : isFetching ? (
                <div className="p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Lade…
                </div>
              ) : !products || products.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">Keine Treffer.</p>
              ) : (
                products.map((p) => {
                  const variants = p.node.variants?.edges ?? [];
                  const allSkus = variants.map((v) => v.node.sku).filter(Boolean) as string[];
                  const selectedCount = allSkus.filter((s) => skuSet.has(s.toLowerCase())).length;
                  const allSelected = allSkus.length > 0 && selectedCount === allSkus.length;
                  return (
                    <div key={p.node.handle} className="border-b border-border last:border-b-0 p-2.5 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        {p.node.images.edges[0]?.node.url ? (
                          <img
                            src={p.node.images.edges[0].node.url}
                            alt=""
                            className="h-10 w-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.node.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {variants.length} Variante{variants.length !== 1 ? "n" : ""}
                            {selectedCount > 0 && ` · ${selectedCount} ausgewählt`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={allSelected ? "secondary" : "outline"}
                          onClick={() => addSkus(allSkus)}
                          disabled={allSkus.length === 0 || allSelected}
                        >
                          {allSelected ? "✓ alle" : `+ ${allSkus.length || 0} SKU${allSkus.length === 1 ? "" : "s"}`}
                        </Button>
                      </div>
                      {variants.length > 1 && (
                        <div className="flex flex-wrap gap-1 mt-2 ml-13">
                          {variants.map((v) => {
                            const sku = v.node.sku;
                            if (!sku) return null;
                            const sel = skuSet.has(sku.toLowerCase());
                            return (
                              <button
                                key={v.node.id}
                                type="button"
                                onClick={() => (sel ? removeSku(sku) : addSkus([sku]))}
                                className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                                  sel
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background border-border hover:bg-muted"
                                }`}
                                title={v.node.title}
                              >
                                {sku}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={replaceMut.isPending}>
            {replaceMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
