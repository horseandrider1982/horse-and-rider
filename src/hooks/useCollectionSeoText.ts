import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCollectionSeoText(handle: string | undefined, locale: string) {
  return useQuery({
    queryKey: ["collection-seo-text", handle, locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_seo_texts")
        .select("heading, body")
        .eq("handle", handle!)
        .eq("locale", locale)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!handle,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
