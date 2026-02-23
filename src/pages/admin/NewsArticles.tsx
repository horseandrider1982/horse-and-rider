import { useState } from 'react';
import { useAdminArticles, useDeleteArticle, CATEGORY_LABELS, type NewsArticle } from '@/hooks/useNewsArticles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Pencil, Trash2, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';

interface NewsArticlesProps {
  onEdit: (id: string) => void;
  onNew: () => void;
  onDuplicate: (article: NewsArticle) => void;
}

export default function NewsArticles({ onEdit, onNew, onDuplicate }: NewsArticlesProps) {
  const { data: articles, isLoading } = useAdminArticles();
  const deleteArticle = useDeleteArticle();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  let filtered = articles || [];
  if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
  if (categoryFilter !== 'all') filtered = filtered.filter(a => a.category === categoryFilter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q));
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Artikel „${title}" wirklich löschen?`)) return;
    try {
      await deleteArticle.mutateAsync(id);
      toast.success('Artikel gelöscht');
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onNew} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Neuer Artikel
        </Button>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="published">Veröffentlicht</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Keine Artikel gefunden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2.5 px-2 font-medium">Bild</th>
                <th className="text-left py-2.5 px-2 font-medium">Titel</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Kategorie</th>
                <th className="text-left py-2.5 px-2 font-medium">Status</th>
                <th className="text-left py-2.5 px-2 font-medium hidden md:table-cell">Datum</th>
                <th className="text-right py-2.5 px-2 font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-2 px-2">
                    {a.cover_image_url ? (
                      <img src={a.cover_image_url} alt="" className="h-10 w-14 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-14 rounded bg-muted" />
                    )}
                  </td>
                  <td className="py-2 px-2 font-medium">{a.title}</td>
                  <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">{CATEGORY_LABELS[a.category]}</td>
                  <td className="py-2 px-2">
                    <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>
                      {a.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 hidden md:table-cell text-muted-foreground">
                    {a.published_at ? new Date(a.published_at).toLocaleDateString('de-DE') : '–'}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(a.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(a)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(a.id, a.title)}>
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
