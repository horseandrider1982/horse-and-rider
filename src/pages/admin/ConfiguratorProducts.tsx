import { useState, useEffect } from "react";
import { useConfiguratorProducts, useAddConfiguratorProduct, useRemoveConfiguratorProduct, useConfiguratorGroups, useProductGroupAssignments, useSaveProductGroups } from "@/hooks/useConfigurator";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest, STOREFRONT_PAGINATED_QUERY, type ShopifyProduct } from "@/lib/shopify";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Settings2, GripVertical, Search } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShopifyProduct } from "@/lib/shopify";
import type { ConfiguratorProduct } from "@/types/configurator";

export default function ConfiguratorProducts() {
  const { data: products, isLoading } = useConfiguratorProducts();
  const addProduct = useAddConfiguratorProduct();
  const removeProduct = useRemoveConfiguratorProduct();
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ConfiguratorProduct | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = products?.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.shopify_handle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemove = async () => {
    if (!deleteId) return;
    try {
      await removeProduct.mutateAsync(deleteId);
      toast.success("Aus Konfigurator entfernt");
    } catch { toast.error("Fehler beim Entfernen"); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Artikel hinzufügen</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !filtered?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Konfigurator-Artikel vorhanden.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="w-12 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
                  {p.featured_image_url && <img src={p.featured_image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.shopify_handle}</p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
                <Button variant="outline" size="sm" onClick={() => setEditProduct(p)}><Settings2 className="h-4 w-4 mr-1" />Gruppen</Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddProductDialog open={addOpen} onOpenChange={setAddOpen} onAdd={async (sp) => {
        try {
          await addProduct.mutateAsync({
            shopify_product_id: sp.node.id,
            shopify_handle: sp.node.handle,
            title: sp.node.title,
            featured_image_url: sp.node.images.edges[0]?.node.url || null,
          });
          toast.success("Artikel hinzugefügt");
          setAddOpen(false);
        } catch (e: any) {
          toast.error(e.message?.includes("duplicate") ? "Artikel bereits vorhanden" : "Fehler");
        }
      }} />

      {editProduct && (
        <EditGroupsDialog product={editProduct} open={!!editProduct} onOpenChange={o => !o && setEditProduct(null)} />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aus Konfigurator entfernen?</AlertDialogTitle>
            <AlertDialogDescription>Der Shopify-Artikel bleibt erhalten. Nur die Konfigurator-Zuordnung wird gelöscht.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Entfernen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddProductDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (p: ShopifyProduct) => void }) {
  const [query, setQuery] = useState("");
  const { data: shopifyProducts, isLoading } = useProducts(20, query || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Shopify-Artikel hinzufügen</DialogTitle>
          <DialogDescription>Suche einen Shopify-Artikel und füge ihn als Konfigurator-Artikel hinzu.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Artikelname suchen…" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div> :
            shopifyProducts?.map(p => (
              <button key={p.node.id} onClick={() => onAdd(p)} className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors text-left">
                <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                  {p.node.images.edges[0] && <img src={p.node.images.edges[0].node.url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.node.title}</p>
                  <p className="text-xs text-muted-foreground">{parseFloat(p.node.priceRange.minVariantPrice.amount).toFixed(2)} €</p>
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditGroupsDialog({ product, open, onOpenChange }: { product: ConfiguratorProduct; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: allGroups } = useConfiguratorGroups();
  const { data: assignments } = useProductGroupAssignments(product.id);
  const saveGroups = useSaveProductGroups();
  const [selected, setSelected] = useState<Array<{ group_id: string; sort_order: number; is_required_override: boolean | null }>>([]);
  const [initialized, setInitialized] = useState(false);

  if (assignments && !initialized) {
    setSelected(assignments.map(a => ({ group_id: a.group_id, sort_order: a.sort_order, is_required_override: a.is_required_override })));
    setInitialized(true);
  }

  const toggleGroup = (groupId: string) => {
    setSelected(prev => {
      const exists = prev.find(s => s.group_id === groupId);
      if (exists) return prev.filter(s => s.group_id !== groupId);
      return [...prev, { group_id: groupId, sort_order: prev.length, is_required_override: null }];
    });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setSelected(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((a, i) => ({ ...a, sort_order: i }));
    });
  };

  const moveDown = (idx: number) => {
    setSelected(prev => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((a, i) => ({ ...a, sort_order: i }));
    });
  };

  const handleSave = async () => {
    try {
      await saveGroups.mutateAsync({ productId: product.id, groups: selected });
      toast.success("Gruppen gespeichert");
      onOpenChange(false);
    } catch { toast.error("Fehler beim Speichern"); }
  };

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setInitialized(false); }}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gruppen für „{product.title}"</DialogTitle>
          <DialogDescription>Wähle und sortiere die Konfigurations-Gruppen für diesen Artikel.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          <p className="text-sm font-medium mb-2">Verfügbare Gruppen:</p>
          {allGroups?.map(g => {
            const selIdx = selected.findIndex(s => s.group_id === g.id);
            const isSelected = selIdx >= 0;
            return (
              <div key={g.id} className={`flex items-center gap-2 p-2 rounded border ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggleGroup(g.id)} />
                <span className="flex-1 text-sm">{g.name}{g.internal_name ? <span className="ml-1 text-xs text-muted-foreground">({g.internal_name})</span> : null}</span>
                {isSelected && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveUp(selIdx)}>↑</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveDown(selIdx)}>↓</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saveGroups.isPending}>
            {saveGroups.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
