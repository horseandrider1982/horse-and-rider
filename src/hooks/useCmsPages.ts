import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CmsPage {
  id: string;
  name: string;
  slug: string;
  title: string;
  content: string;
  editor_mode: 'standard' | 'ai';
  seo_title: string | null;
  seo_description: string | null;
  status: 'draft' | 'active';
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function useAdminCmsPages() {
  return useQuery({
    queryKey: ['admin-cms-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as CmsPage[];
    },
  });
}

export function useAdminCmsPage(id: string) {
  return useQuery({
    queryKey: ['admin-cms-page', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as CmsPage;
    },
    enabled: !!id,
  });
}

export function usePublicCmsPage(slug: string) {
  return useQuery({
    queryKey: ['cms-page', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();
      if (error) throw error;
      return data as CmsPage;
    },
    enabled: !!slug,
  });
}

export function useSaveCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (page: Partial<CmsPage> & { id?: string }) => {
      const { id, ...rest } = page;
      if (id) {
        const { error } = await supabase.from('cms_pages').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cms_pages').insert(rest as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cms-pages'] });
      qc.invalidateQueries({ queryKey: ['admin-cms-page'] });
    },
  });
}

export function useDeleteCmsPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cms_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cms-pages'] }),
  });
}

export function useToggleCmsPageStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'active' }) => {
      const newStatus = status === 'active' ? 'draft' : 'active';
      const update: any = { status: newStatus };
      if (newStatus === 'active') update.published_at = new Date().toISOString();
      const { error } = await supabase.from('cms_pages').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-cms-pages'] }),
  });
}
