import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CmsMenuItem } from '@/hooks/useCmsMenus';

export interface PublicMenuItem {
  id: string;
  type: 'cms_page' | 'custom_link' | 'shopify_menu_placeholder';
  label: string;
  url: string | null;
  target: '_self' | '_blank';
  sort_order: number;
}

export type MenusByKey = Record<string, PublicMenuItem[]>;

export function usePublicCmsMenus() {
  return useQuery({
    queryKey: ['public-cms-menus'],
    queryFn: async () => {
      // Load menus
      const { data: menus, error: menusErr } = await supabase
        .from('cms_menus')
        .select('id, key, name');
      if (menusErr) throw menusErr;

      // Load active menu items
      const { data: items, error: itemsErr } = await supabase
        .from('cms_menu_items')
        .select('id, menu_id, type, label, url, target, sort_order, is_active, cms_page_id')
        .eq('is_active', true)
        .order('sort_order');
      if (itemsErr) throw itemsErr;

      // Load active CMS pages to filter out items referencing inactive pages
      const { data: pages } = await supabase
        .from('cms_pages')
        .select('id, slug, status')
        .eq('status', 'active');

      const activePageIds = new Set((pages || []).map(p => p.id));
      const pageSlugMap = new Map((pages || []).map(p => [p.id, p.slug]));

      // Group items by menu key
      const menuIdToKey = new Map((menus || []).map(m => [m.id, m.key]));
      const result: MenusByKey = {};

      (menus || []).forEach(m => { result[m.key] = []; });

      (items || []).forEach(item => {
        const key = menuIdToKey.get(item.menu_id);
        if (!key) return;

        // Skip cms_page items whose page is not active
        if (item.type === 'cms_page' && item.cms_page_id && !activePageIds.has(item.cms_page_id)) return;

        // For cms_page items, ensure URL is current
        let url = item.url;
        if (item.type === 'cms_page' && item.cms_page_id) {
          const slug = pageSlugMap.get(item.cms_page_id);
          if (slug) url = `/${slug}`;
        }

        result[key].push({
          id: item.id,
          type: item.type as PublicMenuItem['type'],
          label: item.label,
          url,
          target: item.target as '_self' | '_blank',
          sort_order: item.sort_order,
        });
      });

      return result;
    },
    staleTime: 1000 * 60 * 5,
  });
}
