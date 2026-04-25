import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CachedVendor {
  name: string;
  count: number;
}

export interface CachedPropertyValue {
  value: string;
  count: number;
}

export interface CachedPropertyGroup {
  key: string;
  label: string;
  values: CachedPropertyValue[];
}

export interface CollectionFacets {
  vendors: CachedVendor[];
  properties: CachedPropertyGroup[];
  productCount: number;
  computedAt: string;
}

/**
 * Liest vorab berechnete Facetten (Vendor + Property Counts) aus dem
 * server-seitigen Cache. Wird täglich vom Cron neu befüllt.
 * Liefert sofort Daten – auch wenn das Produkt-Listing noch lädt.
 */
export function useCollectionFacets(handle: string | undefined, locale: string) {
  return useQuery({
    queryKey: ["collection-facets-cache", handle, locale],
    enabled: !!handle,
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
    queryFn: async (): Promise<CollectionFacets | null> => {
      const { data, error } = await supabase
        .from("collection_facets_cache")
        .select("vendors, properties, product_count, computed_at")
        .eq("handle", handle!)
        .eq("locale", locale)
        .maybeSingle();

      if (error) {
        console.warn("[useCollectionFacets] read failed", error);
        return null;
      }
      if (!data) return null;

      return {
        vendors: (data.vendors as unknown as CachedVendor[]) || [],
        properties: (data.properties as unknown as CachedPropertyGroup[]) || [],
        productCount: data.product_count || 0,
        computedAt: data.computed_at,
      };
    },
  });
}
