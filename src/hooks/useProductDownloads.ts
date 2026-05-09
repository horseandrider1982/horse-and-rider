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
  sku: string;
  original_filename: string;
  display_filename: string;
  storage_path: string;
  public_url: string;
  file_size_bytes: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

/** Fetch downloads for a list of SKUs (any variant SKU of the product). */
export function useDownloadsForSkus(skus: string[]) {
  const lower = Array.from(new Set(skus.filter(Boolean).map((s) => s.toLowerCase())));
  return useQuery({
    queryKey: ["product-downloads-skus", lower],
    enabled: lower.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_downloads")
        .select("*")
        .in("sku", lower)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductDownload[];
    },
  });
}

/** Admin: list downloads for a single category. */
export function useDownloadsByCategory(categoryKey: string) {
  return useQuery({
    queryKey: ["product-downloads-cat", categoryKey],
    enabled: !!categoryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_downloads")
        .select("*")
        .eq("category_key", categoryKey)
        .order("sku", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductDownload[];
    },
  });
}

export function useDeleteDownload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (download: ProductDownload) => {
      // Remove storage object first (best-effort)
      await supabase.storage.from("product-downloads").remove([download.storage_path]);
      const { error } = await supabase.from("product_downloads").delete().eq("id", download.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-downloads-cat"] });
      qc.invalidateQueries({ queryKey: ["product-downloads-skus"] });
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
      qc.invalidateQueries({ queryKey: ["product-downloads-skus"] });
    },
  });
}

/** Helper: extract SKU candidate from filename (basename without extension, trim trailing _\d+). */
export function extractSkuFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const trimmed = base.replace(/_\d+$/, "");
  return trimmed.trim();
}
