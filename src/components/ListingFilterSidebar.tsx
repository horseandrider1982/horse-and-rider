import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShopifyProduct } from "@/lib/shopify";

export interface ListingFilters {
  vendors: Set<string>;
}

interface ListingFilterSidebarProps {
  products: ShopifyProduct[];
  filters: ListingFilters;
  onFilterChange: (filters: ListingFilters) => void;
  /** Hide the vendor section (e.g. on brand pages where all products share the same vendor) */
  hideVendors?: boolean;
}

export const EMPTY_LISTING_FILTERS: ListingFilters = { vendors: new Set() };

export function useListingFilters(products: ShopifyProduct[], filters: ListingFilters) {
  return useMemo(() => {
    if (filters.vendors.size === 0) return products;
    return products.filter((p) => {
      if (filters.vendors.size > 0 && (!p.node.vendor || !filters.vendors.has(p.node.vendor))) return false;
      return true;
    });
  }, [products, filters]);
}

export const ListingFilterSidebar: React.FC<ListingFilterSidebarProps> = ({
  products,
  filters,
  onFilterChange,
  hideVendors,
}) => {
  const { t } = useI18n();

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

  const hasActiveFilters = filters.vendors.size > 0;

  const toggleVendor = (name: string) => {
    const next = new Set(filters.vendors);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onFilterChange({ ...filters, vendors: next });
  };

  const clearAll = () => {
    onFilterChange(EMPTY_LISTING_FILTERS);
  };

  if (vendorFacets.length <= 1) return null;

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

      {vendorFacets.length > 0 && (
        <div>
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
                    filters.vendors.has(v.name) && "bg-primary/5"
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
  const hasActiveFilters = filters.vendors.size > 0;

  // Check if sidebar would render anything
  const uniqueVendors = useMemo(() => {
    if (hideVendors) return 0;
    return new Set(products.map((p) => p.node.vendor).filter(Boolean)).size;
  }, [products, hideVendors]);

  if (uniqueVendors <= 1) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
          hasActiveFilters
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-muted-foreground hover:text-foreground"
        )}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {t("search.filters")}
        {hasActiveFilters && (
          <span className="text-xs font-bold">{filters.vendors.size}</span>
        )}
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
