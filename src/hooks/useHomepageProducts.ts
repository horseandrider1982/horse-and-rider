import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProductByHandle } from "./useProducts";

export function useHomepageProductHandles() {
  return useQuery({
    queryKey: ["homepage-product-handles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "homepage_product_handles")
        .maybeSingle();
      if (data?.value) {
        try {
          return JSON.parse(data.value) as string[];
        } catch {
          return [];
        }
      }
      return [];
    },
    staleTime: 60_000,
  });
}
