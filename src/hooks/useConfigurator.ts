import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ConfiguratorProduct,
  ConfiguratorGroup,
  ConfiguratorGroupValue,
  ConfiguratorProductGroup,
  ConfiguratorGroupWithValues,
} from '@/types/configurator';

// ─── Admin: Products ───
export function useConfiguratorProducts() {
  return useQuery({
    queryKey: ['configurator-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configurator_products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ConfiguratorProduct[];
    },
  });
}

export function useAddConfiguratorProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<ConfiguratorProduct, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('configurator_products')
        .insert({ ...p, status: 'active' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configurator-products'] }),
  });
}

export function useRemoveConfiguratorProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('configurator_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configurator-products'] }),
  });
}

// ─── Admin: Product Group Assignments ───
export function useProductGroupAssignments(productId: string | undefined) {
  return useQuery({
    queryKey: ['configurator-product-groups', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('configurator_product_groups')
        .select('*')
        .eq('configurator_product_id', productId)
        .order('sort_order');
      if (error) throw error;
      return data as ConfiguratorProductGroup[];
    },
    enabled: !!productId,
  });
}

export function useSaveProductGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, groups }: { productId: string; groups: Array<{ group_id: string; sort_order: number; is_required_override: boolean | null }> }) => {
      // Delete existing
      await supabase.from('configurator_product_groups').delete().eq('configurator_product_id', productId);
      if (groups.length > 0) {
        const { error } = await supabase
          .from('configurator_product_groups')
          .insert(groups.map(g => ({ configurator_product_id: productId, ...g })));
        if (error) throw error;
      }
    },
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ['configurator-product-groups', productId] });
      qc.invalidateQueries({ queryKey: ['configurator-products'] });
    },
  });
}

// ─── Admin: Groups ───
export function useConfiguratorGroups() {
  return useQuery({
    queryKey: ['configurator-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configurator_groups')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as ConfiguratorGroup[];
    },
  });
}

export function useSaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (group: Partial<ConfiguratorGroup> & { name: string; field_type: string }) => {
      if (group.id) {
        const { data, error } = await supabase
          .from('configurator_groups')
          .update({ name: group.name, description: group.description, field_type: group.field_type as any, is_required: group.is_required, sort_order: group.sort_order, updated_at: new Date().toISOString() })
          .eq('id', group.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('configurator_groups')
          .insert({ name: group.name, description: group.description, field_type: group.field_type as any, is_required: group.is_required ?? true, sort_order: group.sort_order ?? 0 })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configurator-groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Check if assigned
      const { count } = await supabase
        .from('configurator_product_groups')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', id);
      if (count && count > 0) throw new Error('Gruppe ist noch Konfigurator-Artikeln zugeordnet.');
      const { error } = await supabase.from('configurator_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configurator-groups'] }),
  });
}

// ─── Admin: Values ───
export function useGroupValues(groupId: string | undefined) {
  return useQuery({
    queryKey: ['configurator-values', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('configurator_group_values')
        .select('*')
        .eq('group_id', groupId)
        .order('sort_order');
      if (error) throw error;
      return data as ConfiguratorGroupValue[];
    },
    enabled: !!groupId,
  });
}

export function useSaveValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<ConfiguratorGroupValue> & { group_id: string; name: string }) => {
      if (v.id) {
        const { error } = await supabase
          .from('configurator_group_values')
          .update({ name: v.name, description: v.description, image_url: v.image_url, price_delta: v.price_delta ?? 0, sku_hint: v.sku_hint, sort_order: v.sort_order ?? 0, is_active: v.is_active ?? true })
          .eq('id', v.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('configurator_group_values')
          .insert({ group_id: v.group_id, name: v.name, description: v.description, image_url: v.image_url, price_delta: v.price_delta ?? 0, sku_hint: v.sku_hint, sort_order: v.sort_order ?? 0, is_active: v.is_active ?? true });
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['configurator-values', v.group_id] }),
  });
}

export function useDeleteValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      const { error } = await supabase.from('configurator_group_values').delete().eq('id', id);
      if (error) throw error;
      return groupId;
    },
    onSuccess: (groupId) => qc.invalidateQueries({ queryKey: ['configurator-values', groupId] }),
  });
}

// ─── Storefront: Check if product is configurator + get config ───
export function useProductConfigurator(shopifyProductId: string | undefined) {
  return useQuery({
    queryKey: ['configurator-storefront', shopifyProductId],
    queryFn: async (): Promise<{ product: ConfiguratorProduct; groups: ConfiguratorGroupWithValues[] } | null> => {
      if (!shopifyProductId) return null;
      
      const { data: cp, error: cpErr } = await supabase
        .from('configurator_products')
        .select('*')
        .eq('shopify_product_id', shopifyProductId)
        .eq('status', 'active')
        .maybeSingle();
      if (cpErr || !cp) return null;

      const { data: assignments } = await supabase
        .from('configurator_product_groups')
        .select('*')
        .eq('configurator_product_id', cp.id)
        .order('sort_order');
      if (!assignments || assignments.length === 0) return null;

      const groupIds = assignments.map(a => a.group_id);
      const { data: groups } = await supabase
        .from('configurator_groups')
        .select('*')
        .in('id', groupIds);
      
      const { data: values } = await supabase
        .from('configurator_group_values')
        .select('*')
        .in('group_id', groupIds)
        .eq('is_active', true)
        .order('sort_order');

      const sortedGroups: ConfiguratorGroupWithValues[] = assignments.map(a => {
        const group = (groups || []).find(g => g.id === a.group_id);
        if (!group) return null;
        return {
          ...group,
          is_required: a.is_required_override ?? group.is_required,
          values: (values || []).filter(v => v.group_id === group.id),
        } as ConfiguratorGroupWithValues;
      }).filter(Boolean) as ConfiguratorGroupWithValues[];

      return { product: cp as ConfiguratorProduct, groups: sortedGroups };
    },
    enabled: !!shopifyProductId,
  });
}
