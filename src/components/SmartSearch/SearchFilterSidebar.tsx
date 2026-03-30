import React from "react";
import type { SearchFacets } from "@/types/search";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SearchFilters {
  vendors: Set<string>;
  collections: Set<string>;
}

interface SearchFilterSidebarProps {
  facets: SearchFacets | null;
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
}

export const SearchFilterSidebar: React.FC<SearchFilterSidebarProps> = ({
  facets,
  filters,
  onFilterChange,
}) => {
  const { t } = useI18n();

  if (!facets) return null;

  const hasActiveFilters = filters.vendors.size > 0 || filters.collections.size > 0;

  const toggleVendor = (name: string) => {
    const next = new Set(filters.vendors);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onFilterChange({ ...filters, vendors: next });
  };

  const toggleCollection = (handle: string) => {
    const next = new Set(filters.collections);
    if (next.has(handle)) next.delete(handle);
    else next.add(handle);
    onFilterChange({ ...filters, collections: next });
  };

  const clearAll = () => {
    onFilterChange({ vendors: new Set(), collections: new Set() });
  };

  const visibleCollections = facets.collections.filter(
    (c) => !c.title.toLowerCase().startsWith("home page")
      && !c.handle.startsWith("frontpage")
  );

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

      {/* Collections */}
      {visibleCollections.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            {t("search.filter_collections")}
          </h4>
          <ScrollArea className={cn(visibleCollections.length > 8 ? "max-h-[220px]" : "")}>
            <div className="space-y-1.5 pr-2">
              {visibleCollections.map((col) => (
                <label
                  key={col.handle}
                  className={cn(
                    "flex items-center gap-2 py-1 px-1.5 rounded-md cursor-pointer text-sm",
                    "hover:bg-muted/50 transition-colors",
                    filters.collections.has(col.handle) && "bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={filters.collections.has(col.handle)}
                    onCheckedChange={() => toggleCollection(col.handle)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="flex-1 truncate text-foreground">{col.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{col.count}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Vendors */}
      {facets.vendors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            {t("search.filter_vendors")}
          </h4>
          <ScrollArea className={cn(facets.vendors.length > 8 ? "max-h-[220px]" : "")}>
            <div className="space-y-1.5 pr-2">
              {facets.vendors.map((v) => (
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
