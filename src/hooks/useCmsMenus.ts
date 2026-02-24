import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CmsMenu {
  id: string;
  key: string;
  name: string;
}

export interface CmsMenuItem {
  id: string;
  menu_id: string;
  type: 'cms_page' | 'custom_link' | 'shopify_menu_placeholder';
  label: string;
  cms_page_id: string | null;
  url: string | null;
  target: '_self' | '_blank';
  sort_order: number;
  is_active: boolean;
}

export function useCmsMenus() {
  return useQuery({
    queryKey: ['cms-menus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_menus')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as CmsMenu[];
    },
  });
}

export function useCmsMenuItems() {
  return useQuery({
    queryKey: ['cms-menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_menu_items')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as CmsMenuItem[];
    },
  });
}

export function useSaveCmsMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<CmsMenuItem> & { id?: string }) => {
      const { id, ...rest } = item;
      if (id) {
        const { error } = await supabase.from('cms_menu_items').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cms_menu_items').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-menu-items'] }),
  });
}

export function useDeleteCmsMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cms_menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-menu-items'] }),
  });
}

export function useBulkUpdateMenuItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; menu_id: string; sort_order: number }>) => {
      for (const item of items) {
        const { error } = await supabase
          .from('cms_menu_items')
          .update({ menu_id: item.menu_id, sort_order: item.sort_order })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms-menu-items'] }),
  });
}
