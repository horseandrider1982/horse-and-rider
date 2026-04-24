import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PropertyDisplayConfig {
  id: string;
  shopify_namespace: string;
  shopify_key: string;
  label: string;
  is_active: boolean;
  display_order: number;
  icon_url: string | null;
  icon_prompt: string | null;
  icon_generated_at: string | null;
}

/** Admin: list all property configs sorted by display_order. */
export function usePropertyConfigsAdmin() {
  return useQuery({
    queryKey: ["property-configs-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_property_display_config")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PropertyDisplayConfig[];
    },
  });
}

/** Public: list only active configs sorted by display_order. */
export function useActivePropertyConfigs() {
  return useQuery({
    queryKey: ["property-configs-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_property_display_config")
        .select("id, shopify_namespace, shopify_key, label, display_order, icon_url")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<
        Pick<
          PropertyDisplayConfig,
          | "id"
          | "shopify_namespace"
          | "shopify_key"
          | "label"
          | "display_order"
          | "icon_url"
        >
      >;
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });
}
