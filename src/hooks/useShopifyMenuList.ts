import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShopifyMenuInfo {
  handle: string;
  title: string;
}

export interface ShopifyCachedMenu {
  id: string;
  handle: string;
  locale: string;
  items: any[];
  synced_at: string;
  updated_at: string;
}

export function useShopifyMenuList() {
  return useQuery({
    queryKey: ['shopify-menu-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'shopify_menus')
        .single();
      if (error) throw error;
      try {
        return JSON.parse(data.value) as ShopifyMenuInfo[];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

export function useShopifyMenuCache() {
  return useQuery({
    queryKey: ['shopify-menu-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopify_menu_cache')
        .select('*')
        .order('handle');
      if (error) throw error;
      return (data || []) as ShopifyCachedMenu[];
    },
  });
}

export function useUpdateShopifyMenuCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: any[] }) => {
      const { error } = await supabase
        .from('shopify_menu_cache' as any)
        .update({ items, synced_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopify-menu-cache'] });
      qc.invalidateQueries({ queryKey: ['shopify-menu'] });
    },
  });
}

export function useUpsertShopifyMenuCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ handle, locale, items }: { handle: string; locale: string; items: any[] }) => {
      const { error } = await supabase
        .from('shopify_menu_cache' as any)
        .upsert(
          { handle, locale, items, synced_at: new Date().toISOString() },
          { onConflict: 'handle,locale' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopify-menu-cache'] });
      qc.invalidateQueries({ queryKey: ['shopify-menu'] });
    },
  });
}
