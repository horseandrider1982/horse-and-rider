import { useState, useMemo } from 'react';
import { useCmsMenus, useCmsMenuItems, useSaveCmsMenuItem, useDeleteCmsMenuItem, useBulkUpdateMenuItems, type CmsMenuItem } from '@/hooks/useCmsMenus';
import { useAdminCmsPages, type CmsPage } from '@/hooks/useCmsPages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, GripVertical, Trash2, Pencil, ExternalLink, FileText, Link as LinkIcon, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableMenuItem({ item, onEdit, onDelete }: { item: CmsMenuItem; onEdit: (item: CmsMenuItem) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const typeIcon = item.type === 'cms_page' ? <FileText className="h-3.5 w-3.5 text-muted-foreground" /> :
    item.type === 'custom_link' ? <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" /> :
    <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded border bg-background text-sm group">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-0.5"><GripVertical className="h-4 w-4 text-muted-foreground" /></button>
      {typeIcon}
      <span className="flex-1 truncate">{item.label}</span>
      {item.target === '_blank' && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onEdit(item)}><Pencil className="h-3 w-3" /></Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
    </div>
  );
}

function DroppableMenu({ menuId, menuName, items, onEdit, onDelete }: {
  menuId: string; menuName: string; items: CmsMenuItem[];
  onEdit: (item: CmsMenuItem) => void; onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `menu-${menuId}` });
  const ids = items.map(i => i.id);

  return (
    <Card className={isOver ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{menuName}</CardTitle></CardHeader>
      <CardContent>
        <div ref={setNodeRef} className="space-y-1.5 min-h-[40px]">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableMenuItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </SortableContext>
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Elemente hierher ziehen</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CmsMenuEditor() {
  const { data: menus, isLoading: menusLoading } = useCmsMenus();
  const { data: allItems, isLoading: itemsLoading } = useCmsMenuItems();
  const { data: pages } = useAdminCmsPages();
  const saveItem = useSaveCmsMenuItem();
  const deleteItem = useDeleteCmsMenuItem();
  const bulkUpdate = useBulkUpdateMenuItems();

  const [editItem, setEditItem] = useState<CmsMenuItem | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editTarget, setEditTarget] = useState<'_self' | '_blank'>('_self');
  const [customLinkDialog, setCustomLinkDialog] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTarget, setNewLinkTarget] = useState<'_self' | '_blank'>('_self');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const menuItemsByMenu = useMemo(() => {
    const map: Record<string, CmsMenuItem[]> = {};
    menus?.forEach(m => { map[m.id] = []; });
    allItems?.forEach(item => {
      if (map[item.menu_id]) map[item.menu_id].push(item);
    });
    return map;
  }, [menus, allItems]);

  const activePages = useMemo(() => (pages || []).filter(p => p.status === 'active'), [pages]);

  if (menusLoading || itemsLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const handleAddCmsPage = async (page: CmsPage, menuId: string) => {
    const menuItems = menuItemsByMenu[menuId] || [];
    try {
      await saveItem.mutateAsync({
        menu_id: menuId,
        type: 'cms_page',
        label: page.title,
        cms_page_id: page.id,
        url: `/pages/${page.slug}`,
        target: '_self',
        sort_order: menuItems.length,
        is_active: true,
      });
      toast.success(`"${page.title}" hinzugefügt`);
    } catch { toast.error('Fehler'); }
  };

  const handleAddCustomLink = async (menuId?: string) => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) { toast.error('Name und URL sind erforderlich'); return; }
    const targetMenu = menuId || menus?.[0]?.id;
    if (!targetMenu) return;
    const menuItems = menuItemsByMenu[targetMenu] || [];
    try {
      await saveItem.mutateAsync({
        menu_id: targetMenu,
        type: 'custom_link',
        label: newLinkName.trim(),
        url: newLinkUrl.trim(),
        target: newLinkTarget,
        sort_order: menuItems.length,
        is_active: true,
      });
      toast.success('Link hinzugefügt');
      setCustomLinkDialog(false);
      setNewLinkName('');
      setNewLinkUrl('');
      setNewLinkTarget('_self');
    } catch { toast.error('Fehler'); }
  };

  const handleAddShopifyPlaceholder = async (menuId: string) => {
    const menuItems = menuItemsByMenu[menuId] || [];
    try {
      await saveItem.mutateAsync({
        menu_id: menuId,
        type: 'shopify_menu_placeholder',
        label: 'Shopify Menü',
        target: '_self',
        sort_order: menuItems.length,
        is_active: true,
      });
      toast.success('Shopify Platzhalter hinzugefügt');
    } catch { toast.error('Fehler'); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Menüpunkt entfernen?')) return;
    try { await deleteItem.mutateAsync(id); toast.success('Entfernt'); }
    catch { toast.error('Fehler'); }
  };

  const handleEditOpen = (item: CmsMenuItem) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditUrl(item.url || '');
    setEditTarget(item.target);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    try {
      await saveItem.mutateAsync({
        id: editItem.id,
        label: editLabel.trim(),
        ...(editItem.type === 'custom_link' ? { url: editUrl.trim() } : {}),
        target: editTarget,
      });
      toast.success('Gespeichert');
      setEditItem(null);
    } catch { toast.error('Fehler'); }
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !allItems) return;

    const activeItem = allItems.find(i => i.id === active.id);
    if (!activeItem) return;

    // Determine target menu
    let targetMenuId: string;
    const overId = over.id as string;
    if (overId.startsWith('menu-')) {
      targetMenuId = overId.replace('menu-', '');
    } else {
      const overItem = allItems.find(i => i.id === overId);
      if (!overItem) return;
      targetMenuId = overItem.menu_id;
    }

    // Build new order
    const menuItems = [...(menuItemsByMenu[targetMenuId] || [])];
    const fromSameMenu = activeItem.menu_id === targetMenuId;

    if (fromSameMenu) {
      const oldIdx = menuItems.findIndex(i => i.id === activeItem.id);
      const overItem = allItems.find(i => i.id === overId);
      const newIdx = overItem ? menuItems.findIndex(i => i.id === overItem.id) : menuItems.length;
      if (oldIdx === -1 || oldIdx === newIdx) return;
      menuItems.splice(oldIdx, 1);
      menuItems.splice(newIdx < 0 ? menuItems.length : newIdx, 0, activeItem);
    } else {
      // Remove from old menu items and add to new
      const overItem = allItems.find(i => i.id === overId);
      const newIdx = overItem ? menuItems.findIndex(i => i.id === overItem.id) : menuItems.length;
      menuItems.splice(newIdx < 0 ? menuItems.length : newIdx, 0, { ...activeItem, menu_id: targetMenuId });
    }

    // Also update old menu if moving between menus
    const updates = menuItems.map((item, idx) => ({
      id: item.id,
      menu_id: targetMenuId,
      sort_order: idx,
    }));

    if (!fromSameMenu) {
      const oldMenuItems = (menuItemsByMenu[activeItem.menu_id] || []).filter(i => i.id !== activeItem.id);
      oldMenuItems.forEach((item, idx) => {
        updates.push({ id: item.id, menu_id: activeItem.menu_id, sort_order: idx });
      });
    }

    try {
      await bulkUpdate.mutateAsync(updates);
    } catch { toast.error('Fehler beim Sortieren'); }
  };

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      {/* Left: Content Sources */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Inhalte hinzufügen</h3>

        {/* CMS Pages */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Statische Seiten</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {activePages.length === 0 && <p className="text-xs text-muted-foreground">Keine aktiven Seiten</p>}
            {activePages.map(page => (
              <div key={page.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/50 group">
                <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate">{page.title}</span>
                <Select onValueChange={(menuId) => handleAddCmsPage(page, menuId)}>
                  <SelectTrigger className="h-6 w-6 p-0 border-0 opacity-0 group-hover:opacity-100"><Plus className="h-3 w-3" /></SelectTrigger>
                  <SelectContent>
                    {menus?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Custom Link */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Custom Link</CardTitle></CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setCustomLinkDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Neuen Link erstellen
            </Button>
          </CardContent>
        </Card>

        {/* Shopify Placeholder */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Shopify Menü</CardTitle></CardHeader>
          <CardContent>
            <Select onValueChange={(menuId) => handleAddShopifyPlaceholder(menuId)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Platzhalter einfügen in…" /></SelectTrigger>
              <SelectContent>
                {menus?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Right: Menus */}
      <div className="lg:col-span-3 space-y-4">
        <h3 className="font-semibold text-sm">Menüs</h3>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid md:grid-cols-2 gap-4">
            {menus?.map(menu => (
              <DroppableMenu
                key={menu.id}
                menuId={menu.id}
                menuName={menu.name}
                items={menuItemsByMenu[menu.id] || []}
                onEdit={handleEditOpen}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>
          <DragOverlay>
            {activeId && allItems ? (() => {
              const item = allItems.find(i => i.id === activeId);
              return item ? <div className="p-2 rounded border bg-background shadow-lg text-sm">{item.label}</div> : null;
            })() : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Menüpunkt bearbeiten</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={editLabel} onChange={e => setEditLabel(e.target.value)} />
            </div>
            {editItem?.type === 'custom_link' && (
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input value={editUrl} onChange={e => setEditUrl(e.target.value)} />
              </div>
            )}
            {editItem?.type === 'cms_page' && (
              <p className="text-sm text-muted-foreground">Verlinkte Seite: {editItem.url}</p>
            )}
            <div className="space-y-1.5">
              <Label>Ziel</Label>
              <Select value={editTarget} onValueChange={(v) => setEditTarget(v as '_self' | '_blank')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Gleiches Fenster</SelectItem>
                  <SelectItem value="_blank">Neues Fenster</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Abbrechen</Button>
            <Button onClick={handleEditSave}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Link Dialog */}
      <Dialog open={customLinkDialog} onOpenChange={setCustomLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neuen Custom Link erstellen</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={newLinkName} onChange={e => setNewLinkName(e.target.value)} placeholder="Link-Bezeichnung" />
            </div>
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Ziel</Label>
              <Select value={newLinkTarget} onValueChange={(v) => setNewLinkTarget(v as '_self' | '_blank')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Gleiches Fenster</SelectItem>
                  <SelectItem value="_blank">Neues Fenster</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Menü</Label>
              <Select onValueChange={(menuId) => handleAddCustomLink(menuId)}>
                <SelectTrigger><SelectValue placeholder="Hinzufügen zu…" /></SelectTrigger>
                <SelectContent>
                  {menus?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
