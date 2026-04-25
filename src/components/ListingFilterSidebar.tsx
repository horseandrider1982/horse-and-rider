import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShopifyProduct, ShopifyMetafield } from "@/lib/shopify";
import { useActivePropertyConfigs } from "@/hooks/usePropertyConfig";
import type { CollectionFacets } from "@/hooks/useCollectionFacets";

export interface ListingFilters {
  vendors: Set<string>;
  /** key (e.g. "gebissmaterial") → set of selected values */
  properties: Record<string, Set<string>>;
}

interface ListingFilterSidebarProps {
  products: ShopifyProduct[];
  filters: ListingFilters;
  onFilterChange: (filters: ListingFilters) => void;
  /** Hide the vendor section (e.g. on brand pages where all products share the same vendor) */
  hideVendors?: boolean;
  /** Pre-computed facets from server cache (sofortige Anzeige, bevor Produkte geladen sind) */
  cachedFacets?: CollectionFacets | null;
}

export const EMPTY_LISTING_FILTERS: ListingFilters = {
  vendors: new Set(),
  properties: {},
};

/* ---------- value extraction helpers ---------- */

/** Normalize a metafield value into a list of human-readable values.
 *  Handles list.* metafield types (JSON arrays) and plain strings. */
function extractMetafieldValues(mf: ShopifyMetafield | null | undefined): string[] {
  if (!mf || mf.value == null || mf.value === "") return [];
  const v = mf.value.trim();
  // list.* types come as JSON-encoded arrays
  if (v.startsWith("[")) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      // fall through
    }
  }
  return [v];
}

/** Collect xentral_props values for a product (merging product-level + variant-level). */
function collectProductPropertyValues(p: ShopifyProduct): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (mfs: (ShopifyMetafield | null)[] | undefined) => {
    if (!mfs) return;
    for (const mf of mfs) {
      if (!mf) continue;
      const vals = extractMetafieldValues(mf);
      if (!vals.length) continue;
      let bucket = out.get(mf.key);
      if (!bucket) {
        bucket = new Set();
        out.set(mf.key, bucket);
      }
      for (const v of vals) bucket.add(v);
    }
  };
  add(p.node.xentralMetafields);
  for (const { node: variant } of p.node.variants?.edges || []) {
    add(variant.xentralMetafields);
  }
  return out;
}

/* ---------- filtering ---------- */

export function useListingFilters(products: ShopifyProduct[], filters: ListingFilters) {
  const activePropertyKeys = useMemo(
    () => Object.keys(filters.properties).filter((k) => filters.properties[k]?.size),
    [filters.properties],
  );
  const hasVendor = filters.vendors.size > 0;
  const hasProps = activePropertyKeys.length > 0;

  return useMemo(() => {
    if (!hasVendor && !hasProps) return products;
    return products.filter((p) => {
      if (hasVendor && (!p.node.vendor || !filters.vendors.has(p.node.vendor))) return false;
      if (hasProps) {
        const productValues = collectProductPropertyValues(p);
        for (const key of activePropertyKeys) {
          const wanted = filters.properties[key];
          const have = productValues.get(key);
          if (!have) return false;
          let hit = false;
          for (const v of wanted) {
            if (have.has(v)) {
              hit = true;
              break;
            }
          }
          if (!hit) return false;
        }
      }
      return true;
    });
  }, [products, filters, hasVendor, hasProps, activePropertyKeys]);
}

/* ---------- sidebar component ---------- */

export const ListingFilterSidebar: React.FC<ListingFilterSidebarProps> = ({
  products,
  filters,
  onFilterChange,
  hideVendors,
}) => {
  const { t } = useI18n();
  const { data: propertyConfigs } = useActivePropertyConfigs();

  const vendorFacets = useMemo(() => {
    if (hideVendors) return [];
    const map = new Map<string, number>();
    for (const p of products) {
      const v = p.node.vendor;
      if (v) map.set(v, (map.get(v) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [products, hideVendors]);

  /** propertyFacets: per active config key, list of {value, count} present in collection.
   *  Counts how many products have at least one variant/product-level value matching. */
  const propertyFacets = useMemo(() => {
    if (!propertyConfigs?.length) return [] as Array<{
      key: string;
      label: string;
      values: Array<{ value: string; count: number }>;
    }>;
    const counts = new Map<string, Map<string, number>>();
    for (const p of products) {
      const productValues = collectProductPropertyValues(p);
      for (const [key, vals] of productValues) {
        let bucket = counts.get(key);
        if (!bucket) {
          bucket = new Map();
          counts.set(key, bucket);
        }
        for (const v of vals) bucket.set(v, (bucket.get(v) || 0) + 1);
      }
    }
    return propertyConfigs
      .map((cfg) => {
        const bucket = counts.get(cfg.shopify_key);
        if (!bucket || bucket.size === 0) return null;
        const values = Array.from(bucket.entries())
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.value.localeCompare(b.value, undefined, { numeric: true });
          });
        return { key: cfg.shopify_key, label: cfg.label, values };
      })
      .filter((g): g is { key: string; label: string; values: Array<{ value: string; count: number }> } =>
        g !== null && g.values.length > 1, // hide single-value (no filtering benefit)
      );
  }, [products, propertyConfigs]);

  const activePropertyCount = useMemo(
    () => Object.values(filters.properties).reduce((acc, set) => acc + (set?.size || 0), 0),
    [filters.properties],
  );
  const hasActiveFilters = filters.vendors.size > 0 || activePropertyCount > 0;

  const toggleVendor = (name: string) => {
    const next = new Set(filters.vendors);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onFilterChange({ ...filters, vendors: next });
  };

  const toggleProperty = (key: string, value: string) => {
    const current = filters.properties[key];
    const next = new Set(current || []);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const nextProps = { ...filters.properties };
    if (next.size === 0) delete nextProps[key];
    else nextProps[key] = next;
    onFilterChange({ ...filters, properties: nextProps });
  };

  const clearAll = () => onFilterChange(EMPTY_LISTING_FILTERS);

  // Hide entire sidebar if nothing useful to show
  if (vendorFacets.length <= 1 && propertyFacets.length === 0) return null;

  return (
    <div className="w-full">
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="mb-3 text-xs text-muted-foreground hover:text-foreground w-full justify-start px-0"
        >
          <X className="w-3 h-3 mr-1" />
          {t("search.clear_filters")}
        </Button>
      )}

      {vendorFacets.length > 1 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            {t("search.filter_vendors")}
          </h4>
          <ScrollArea className={cn(vendorFacets.length > 8 ? "max-h-[280px]" : "")}>
            <div className="space-y-1.5 pr-2">
              {vendorFacets.map((v) => (
                <label
                  key={v.name}
                  className={cn(
                    "flex items-center gap-2 py-1 px-1.5 rounded-md cursor-pointer text-sm",
                    "hover:bg-muted/50 transition-colors",
                    filters.vendors.has(v.name) && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    checked={filters.vendors.has(v.name)}
                    onCheckedChange={() => toggleVendor(v.name)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="flex-1 truncate text-foreground">{v.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{v.count}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {propertyFacets.map((group) => {
        const selected = filters.properties[group.key] || new Set<string>();
        return (
          <div key={group.key} className="mb-6">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              {group.label}
            </h4>
            <ScrollArea className={cn(group.values.length > 8 ? "max-h-[240px]" : "")}>
              <div className="space-y-1.5 pr-2">
                {group.values.map((v) => (
                  <label
                    key={v.value}
                    className={cn(
                      "flex items-center gap-2 py-1 px-1.5 rounded-md cursor-pointer text-sm",
                      "hover:bg-muted/50 transition-colors",
                      selected.has(v.value) && "bg-primary/5",
                    )}
                  >
                    <Checkbox
                      checked={selected.has(v.value)}
                      onCheckedChange={() => toggleProperty(group.key, v.value)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1 truncate text-foreground">{v.value}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{v.count}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};

/** Mobile filter toggle + drawer */
export function MobileFilterToggle({
  products,
  filters,
  onFilterChange,
  hideVendors,
}: ListingFilterSidebarProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { data: propertyConfigs } = useActivePropertyConfigs();

  const activePropertyCount = useMemo(
    () => Object.values(filters.properties).reduce((acc, set) => acc + (set?.size || 0), 0),
    [filters.properties],
  );
  const hasActiveFilters = filters.vendors.size > 0 || activePropertyCount > 0;
  const totalActive = filters.vendors.size + activePropertyCount;

  // Decide whether to show the toggle at all (sidebar would render nothing?)
  const wouldRender = useMemo(() => {
    const uniqueVendors = hideVendors
      ? 0
      : new Set(products.map((p) => p.node.vendor).filter(Boolean)).size;
    if (uniqueVendors > 1) return true;

    if (propertyConfigs?.length) {
      const counts = new Map<string, Set<string>>();
      for (const p of products) {
        const vals = collectProductPropertyValues(p);
        for (const [k, vs] of vals) {
          let b = counts.get(k);
          if (!b) {
            b = new Set();
            counts.set(k, b);
          }
          for (const v of vs) b.add(v);
        }
      }
      for (const cfg of propertyConfigs) {
        const b = counts.get(cfg.shopify_key);
        if (b && b.size > 1) return true;
      }
    }
    return false;
  }, [products, hideVendors, propertyConfigs]);

  if (!wouldRender) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
          hasActiveFilters
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t("search.filters")}
        {hasActiveFilters && <span className="text-xs font-bold">{totalActive}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-72 max-w-[85vw] bg-background h-full overflow-y-auto px-4 py-5 shadow-xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide">{t("search.filters")}</h3>
              <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ListingFilterSidebar
              products={products}
              filters={filters}
              onFilterChange={onFilterChange}
              hideVendors={hideVendors}
            />
          </div>
        </div>
      )}
    </>
  );
}
