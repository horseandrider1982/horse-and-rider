import { useState } from 'react';
import { useAdminCmsPages, useDeleteCmsPage, useToggleCmsPageStatus, type CmsPage } from '@/hooks/useCmsPages';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Copy, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface CmsPagesProps {
  onNew: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (page: CmsPage) => void;
}

export default function CmsPages({ onNew, onEdit, onDuplicate }: CmsPagesProps) {
  const { data: pages, isLoading } = useAdminCmsPages();
  const deletePage = useDeleteCmsPage();
  const toggleStatus = useToggleCmsPageStatus();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  let filtered = pages || [];
  if (statusFilter !== 'all') filtered = filtered.filter(p => p.status === statusFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Seite „${name}" wirklich löschen? Zugehörige Menüitems werden ebenfalls entfernt.`)) return;
    try {
      await deletePage.mutateAsync(id);
      toast.success('Seite gelöscht');
    } catch { toast.error('Fehler beim Löschen'); }
  };

  const handleToggle = async (id: string, status: 'draft' | 'active') => {
    try {
      await toggleStatus.mutateAsync({ id, status });
      toast.success(status === 'active' ? 'Seite deaktiviert' : 'Seite aktiviert');
    } catch { toast.error('Fehler beim Statuswechsel'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1.5" />Neue Seite</Button>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Keine Seiten gefunden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2.5 px-2 font-medium">Name</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Slug</th>
                <th className="text-left py-2.5 px-2 font-medium">Sprache</th>
                <th className="text-left py-2.5 px-2 font-medium">Status</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Aktualisiert</th>
                <th className="text-right py-2.5 px-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-2 font-medium">{p.name}</td>
                  <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">/pages/{p.slug}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className="text-xs uppercase">{(p as any).locale || 'de'}</Badge>
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'}>
                      {p.status === 'active' ? 'Aktiv' : 'Entwurf'}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(p.id)} title="Bearbeiten">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(p.id, p.status)} title={p.status === 'active' ? 'Deaktivieren' : 'Aktivieren'}>
                        {p.status === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(p)} title="Duplizieren">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id, p.name)} title="Löschen">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
