import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicMenuItem {
  id: string;
  type: 'cms_page' | 'custom_link' | 'shopify_menu_placeholder';
  label: string;
  url: string | null;
  target: '_self' | '_blank';
  sort_order: number;
  children?: PublicMenuItem[];
}

export type MenusByKey = Record<string, PublicMenuItem[]>;

export function usePublicCmsMenus() {
  return useQuery({
    queryKey: ['public-cms-menus'],
    queryFn: async () => {
      const { data: menus, error: menusErr } = await supabase
        .from('cms_menus')
        .select('id, key, name');
      if (menusErr) throw menusErr;

      const { data: items, error: itemsErr } = await supabase
        .from('cms_menu_items')
        .select('id, menu_id, parent_id, type, label, url, target, sort_order, is_active, cms_page_id')
        .eq('is_active', true)
        .order('sort_order');
      if (itemsErr) throw itemsErr;

      const { data: pages } = await supabase
        .from('cms_pages')
        .select('id, slug, status')
        .eq('status', 'active');

      const activePageIds = new Set((pages || []).map(p => p.id));
      const pageSlugMap = new Map((pages || []).map(p => [p.id, p.slug]));
      const menuIdToKey = new Map((menus || []).map(m => [m.id, m.key]));

      // Build flat list first
      const allParsed: Array<PublicMenuItem & { menu_id: string; parent_id: string | null }> = [];

      (items || []).forEach(item => {
        if (item.type === 'cms_page' && item.cms_page_id && !activePageIds.has(item.cms_page_id)) return;

        let url = item.url;
        if (item.type === 'cms_page' && item.cms_page_id) {
          const slug = pageSlugMap.get(item.cms_page_id);
          if (slug) url = `/${slug}`;
        }

        allParsed.push({
          id: item.id,
          menu_id: item.menu_id,
          parent_id: (item as any).parent_id || null,
          type: item.type as PublicMenuItem['type'],
          label: item.label,
          url,
          target: item.target as '_self' | '_blank',
          sort_order: item.sort_order,
          children: [],
        });
      });

      // Build tree per menu
      const result: MenusByKey = {};
      (menus || []).forEach(m => { result[m.key] = []; });

      const itemMap = new Map(allParsed.map(i => [i.id, i]));

      allParsed.forEach(item => {
        const key = menuIdToKey.get(item.menu_id);
        if (!key) return;

        if (item.parent_id && itemMap.has(item.parent_id)) {
          const parent = itemMap.get(item.parent_id)!;
          if (!parent.children) parent.children = [];
          parent.children.push({
            id: item.id,
            type: item.type,
            label: item.label,
            url: item.url,
            target: item.target,
            sort_order: item.sort_order,
            children: item.children,
          });
        } else {
          result[key].push({
            id: item.id,
            type: item.type,
            label: item.label,
            url: item.url,
            target: item.target,
            sort_order: item.sort_order,
            children: item.children,
          });
        }
      });

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}
