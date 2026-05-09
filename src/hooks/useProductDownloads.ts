import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DownloadCategory = {
  id: string;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export type ProductDownload = {
  id: string;
  category_key: string;
  sku: string | null;
  title: string | null;
  original_filename: string;
  display_filename: string;
  storage_path: string;
  public_url: string;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DownloadSkuAssignment = {
  id: string;
  download_id: string;
  sku: string;
};

export function useDownloadCategories() {
  return useQuery({
    queryKey: ["download-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("download_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DownloadCategory[];
    },
  });
}

/** Fetch downloads attached to any of the given variant SKUs (via assignment table). */
export function useDownloadsForSkus(skus: string[]) {
  const lower = Array.from(new Set(skus.filter(Boolean).map((s) => s.toLowerCase())));
  return useQuery({
    queryKey: ["product-downloads-for-skus", lower],
    enabled: lower.length > 0,
    queryFn: async () => {
      const { data: assigns, error: e1 } = await supabase
        .from("product_download_skus")
        .select("download_id")
        .in("sku", lower);
      if (e1) throw e1;
      const ids = Array.from(new Set((assigns ?? []).map((a: any) => a.download_id)));
      if (ids.length === 0) return [] as ProductDownload[];
      const { data, error } = await supabase
        .from("product_downloads")
        .select("*")
        .in("id", ids)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductDownload[];
    },
  });
}

/** Admin: list all downloads in a category. */
export function useDownloadsByCategory(categoryKey: string) {
  return useQuery({
    queryKey: ["product-downloads-cat", categoryKey],
    enabled: !!categoryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_downloads")
        .select("*")
        .eq("category_key", categoryKey)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductDownload[];
    },
  });
}

/** Admin: list SKU assignments for a set of downloads. */
export function useAssignmentsForDownloads(downloadIds: string[]) {
  return useQuery({
    queryKey: ["product-download-assigns", downloadIds.slice().sort()],
    enabled: downloadIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_download_skus")
        .select("*")
        .in("download_id", downloadIds);
      if (error) throw error;
      return (data ?? []) as DownloadSkuAssignment[];
    },
  });
}

export function useDeleteDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (download: ProductDownload) => {
      await supabase.storage.from("product-downloads").remove([download.storage_path]);
      const { error } = await supabase.from("product_downloads").delete().eq("id", download.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-downloads-cat"] });
      qc.invalidateQueries({ queryKey: ["product-downloads-for-skus"] });
      qc.invalidateQueries({ queryKey: ["product-download-assigns"] });
    },
  });
}

export function useUpdateDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<ProductDownload> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("product_downloads").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-downloads-cat"] });
      qc.invalidateQueries({ queryKey: ["product-downloads-for-skus"] });
    },
  });
}

/** Replace all SKU assignments for a download with the given list (lowercased, deduped). */
export function useReplaceAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ downloadId, skus }: { downloadId: string; skus: string[] }) => {
      const clean = Array.from(new Set(skus.map((s) => s.trim().toLowerCase()).filter(Boolean)));
      const { error: delErr } = await supabase
        .from("product_download_skus")
        .delete()
        .eq("download_id", downloadId);
      if (delErr) throw delErr;
      if (clean.length === 0) return;
      const rows = clean.map((sku) => ({ download_id: downloadId, sku }));
      const { error: insErr } = await supabase.from("product_download_skus").insert(rows);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-download-assigns"] });
      qc.invalidateQueries({ queryKey: ["product-downloads-for-skus"] });
    },
  });
}
