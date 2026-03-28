import { useState } from 'react';
import { useShopifyMenuCache, useShopifyMenuList, useUpdateShopifyMenuCache, useUpsertShopifyMenuCache, type ShopifyCachedMenu } from '@/hooks/useShopifyMenuList';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Pencil, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';

interface CacheMenuItem {
  id: string;
  title: string;
  url: string;
  handle: string | null;
  items: CacheMenuItem[];
}

function MenuItemRow({ item, onRemove, onEdit }: { item: CacheMenuItem; onRemove: () => void; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded border bg-background text-sm group">
      <span className="flex-1 truncate">{item.title}</span>
      <span className="text-xs text-muted-foreground truncate max-w-[150px]">{item.url}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

export default function ShopifyMenuCacheManager() {
  const { data: cachedMenus, isLoading } = useShopifyMenuCache();
  const { data: shopifyMenuList } = useShopifyMenuList();
  const updateCache = useUpdateShopifyMenuCache();
  const upsertCache = useUpsertShopifyMenuCache();

  const [syncing, setSyncing] = useState(false);
  const [editMenu, setEditMenu] = useState<ShopifyCachedMenu | null>(null);
  const [editItems, setEditItems] = useState<CacheMenuItem[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [editItemDialog, setEditItemDialog] = useState<{ index: number; title: string; url: string } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-menus', {
        body: {},
      });
      if (error) throw error;
      const results = data?.results || [];
      const synced = results.filter((r: any) => r.status === 'synced').length;
      const skipped = results.filter((r: any) => r.status.startsWith('skipped')).length;
      toast.success(`Sync: ${synced} aktualisiert, ${skipped} übersprungen`);
      if (skipped > 0) {
        toast.info('Einige Menüs konnten nicht von Shopify geladen werden (fehlender Scope). Bearbeite sie manuell.');
      }
    } catch (err: any) {
      toast.error(`Sync fehlgeschlagen: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenEdit = (menu: ShopifyCachedMenu) => {
    setEditMenu(menu);
    setEditItems(Array.isArray(menu.items) ? [...menu.items] : []);
  };

  const handleSaveItems = async () => {
    if (!editMenu) return;
    try {
      await updateCache.mutateAsync({ id: editMenu.id, items: editItems });
      toast.success('Menü-Cache gespeichert');
      setEditMenu(null);
    } catch {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleAddItem = () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error('Titel und URL sind erforderlich');
      return;
    }
    const handleMatch = newUrl.match(/\/collections\/([^/?]+)/);
    setEditItems([...editItems, {
      id: `item-${Date.now()}`,
      title: newTitle.trim(),
      url: newUrl.trim(),
      handle: handleMatch?.[1] || null,
      items: [],
    }]);
    setAddDialog(false);
    setNewTitle('');
    setNewUrl('');
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleEditItem = (index: number) => {
    const item = editItems[index];
    setEditItemDialog({ index, title: item.title, url: item.url });
  };

  const handleSaveEditItem = () => {
    if (!editItemDialog) return;
    const updated = [...editItems];
    const handleMatch = editItemDialog.url.match(/\/collections\/([^/?]+)/);
    updated[editItemDialog.index] = {
      ...updated[editItemDialog.index],
      title: editItemDialog.title,
      url: editItemDialog.url,
      handle: handleMatch?.[1] || null,
    };
    setEditItems(updated);
    setEditItemDialog(null);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  // Group by handle
  const byHandle = new Map<string, ShopifyCachedMenu[]>();
  cachedMenus?.forEach(m => {
    const list = byHandle.get(m.handle) || [];
    list.push(m);
    byHandle.set(m.handle, list);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Shopify Menü-Cache
          </h2>
          <p className="text-sm text-muted-foreground">
            Gecachte Kopien der Shopify-Navigationsmenüs. Bearbeite die Einträge manuell oder synchronisiere von Shopify.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Von Shopify synchronisieren
        </Button>
      </div>

      {byHandle.size === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Keine gecachten Menüs vorhanden.</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {Array.from(byHandle.entries()).map(([handle, menus]) => (
          <Card key={handle}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{handle}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {menus.length} Sprache(n)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {menus.map(menu => (
                <div key={menu.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div>
                    <span className="font-medium uppercase">{menu.locale}</span>
                    <span className="text-muted-foreground ml-2">
                      {Array.isArray(menu.items) ? menu.items.length : 0} Einträge
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      Sync: {new Date(menu.synced_at).toLocaleDateString('de')}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(menu)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Bearbeiten
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Menu Items Dialog */}
      <Dialog open={!!editMenu} onOpenChange={(open) => !open && setEditMenu(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Menü bearbeiten: {editMenu?.handle} ({editMenu?.locale.toUpperCase()})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {editItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Einträge. Füge welche hinzu.</p>
            )}
            {editItems.map((item, i) => (
              <MenuItemRow key={item.id || i} item={item} onRemove={() => handleRemoveItem(i)} onEdit={() => handleEditItem(i)} />
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setAddDialog(true); setNewTitle(''); setNewUrl(''); }}>
            <Plus className="h-3.5 w-3.5 mr-1" />Eintrag hinzufügen
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMenu(null)}>Abbrechen</Button>
            <Button onClick={handleSaveItems} disabled={updateCache.isPending}>
              {updateCache.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuen Menüeintrag hinzufügen</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Titel</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="z.B. Reiter" />
            </div>
            <div className="space-y-1.5">
              <Label>URL / Pfad</Label>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="/collections/reiter" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Abbrechen</Button>
            <Button onClick={handleAddItem}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItemDialog} onOpenChange={(open) => !open && setEditItemDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eintrag bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Titel</Label>
              <Input value={editItemDialog?.title || ''} onChange={e => setEditItemDialog(prev => prev ? { ...prev, title: e.target.value } : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>URL / Pfad</Label>
              <Input value={editItemDialog?.url || ''} onChange={e => setEditItemDialog(prev => prev ? { ...prev, url: e.target.value } : null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemDialog(null)}>Abbrechen</Button>
            <Button onClick={handleSaveEditItem}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
