import React, { useRef, useEffect, useState, useMemo } from "react";
import { X, Search, Sparkles, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSearchOverlay } from "@/hooks/useSearchOverlay";
import { SearchProductGrid } from "./SearchProductGrid";
import { SearchEmptyState } from "./SearchEmptyState";
import { AIAdvisorPanel } from "./AIAdvisorPanel";
import { SearchFilterSidebar, type SearchFilters } from "./SearchFilterSidebar";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n";
import type { SearchResults } from "@/types/search";

const SUGGESTION_CHIPS = [
  "Winterdecke für mein Pferd",
  "Airbagweste für Vielseitigkeit",
  "Samshield Größenberatung",
  "Gebiss für empfindliche Pferde",
  "Gamaschen fürs Gelände",
  "Schabracke Warmblut",
];

const EMPTY_FILTERS: SearchFilters = { vendors: new Set(), collections: new Set() };

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const { t, localePath } = useI18n();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, results, isLoading, isLoadingMore, aiResult, aiLoading, hasNextPage, handleQueryChange, loadMore, reset, isAdvisory } = useSearchOverlay();

  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const hasResults = (results?.groups?.products?.length ?? 0) > 0;
  const hasQuery = query.trim().length >= 2;
  const hasFacets = (results?.facets?.vendors?.length ?? 0) > 0 || (results?.facets?.collections?.length ?? 0) > 0;
  const hasActiveFilters = filters.vendors.size > 0 || filters.collections.size > 0;

  // Reset filters when query changes
  useEffect(() => {
    setFilters(EMPTY_FILTERS);
  }, [query]);

  // Apply client-side filters + boost AI-recommended products to top
  const filteredResults = useMemo((): SearchResults | null => {
    if (!results) return null;

    let products = results.groups.products;

    // Filter by vendor/collection
    if (hasActiveFilters) {
      products = products.filter((p) => {
        if (filters.vendors.size > 0 && (!p.vendor || !filters.vendors.has(p.vendor))) return false;
        if (filters.collections.size > 0) {
          const productCollections = p.collections || [];
          const match = productCollections.some((c) => filters.collections.has(c.handle));
          if (!match) return false;
        }
        return true;
      });
    }

    // Boost AI-recommended products to the top
    if (aiResult?.recommendedProducts && aiResult.recommendedProducts.length > 0) {
      const recNames = aiResult.recommendedProducts.map((n) => n.toLowerCase());
      const boosted: typeof products = [];
      const rest: typeof products = [];

      for (const p of products) {
        const titleLower = p.title.toLowerCase();
        const isBoosted = recNames.some(
          (rec) => titleLower.includes(rec) || rec.includes(titleLower)
        );
        if (isBoosted) boosted.push(p);
        else rest.push(p);
      }

      products = [...boosted, ...rest];
    }

    return { ...results, groups: { ...results.groups, products } };
  }, [results, filters, hasActiveFilters, aiResult]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
      return () => { clearTimeout(t); document.body.style.overflow = ""; };
    }
    document.body.style.overflow = "";
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { onClose(); reset(); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, reset]);

  const handleChipClick = (chip: string) => { handleQueryChange(chip); inputRef.current?.focus(); };
  const handleProductClick = (handle: string) => { onClose(); reset(); navigate(localePath(`/product/${handle}`)); };
  const handleClose = () => { onClose(); reset(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={handleClose} />
      <div className={cn("relative z-10 bg-background flex flex-col max-h-full overflow-hidden", isMobile ? "h-full w-full" : "mx-auto mt-0 w-full max-w-full rounded-b-2xl shadow-2xl")} style={isMobile ? {} : { maxHeight: "92vh" }}>
        {/* Header */}
        <div className="border-b border-border px-4 sm:px-8 lg:px-12 py-4 sm:py-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">{t("search.title")}</span>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label={t("search.close")}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{t("search.subtitle")}</p>
          <div className="relative max-w-3xl flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input ref={inputRef} type="text" placeholder={t("search.placeholder")} value={query} onChange={(e) => handleQueryChange(e.target.value)}
                className={cn("w-full h-12 sm:h-14 pl-12 pr-12 rounded-xl border-2 bg-background text-base sm:text-lg", "text-foreground placeholder:text-muted-foreground", "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20", "transition-all border-border")} />
              {query && (
                <button type="button" onClick={() => { handleQueryChange(""); inputRef.current?.focus(); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={t("search.clear")}>
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {/* Mobile filter toggle */}
            {isMobile && hasQuery && hasFacets && (
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className={cn(
                  "h-12 sm:h-14 px-3 rounded-xl border-2 transition-all flex items-center gap-1.5",
                  hasActiveFilters ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {hasActiveFilters && <span className="text-xs font-bold">{filters.vendors.size + filters.collections.size}</span>}
              </button>
            )}
          </div>


        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {!hasQuery ? (
            <div className="flex-1 overflow-y-auto">
              <SearchEmptyState onChipClick={handleChipClick} onProductClick={handleProductClick} />
            </div>
          ) : (
            <>
              {/* Desktop filter sidebar */}
              {!isMobile && hasFacets && (
                <div className="w-56 xl:w-64 flex-shrink-0 border-r border-border overflow-y-auto px-4 py-5">
                  <SearchFilterSidebar facets={results?.facets ?? null} filters={filters} onFilterChange={setFilters} />
                </div>
              )}

              {/* Mobile filter panel */}
              {isMobile && showMobileFilters && hasFacets && (
                <div className="absolute inset-x-0 top-0 bottom-0 z-20 bg-background overflow-y-auto px-4 py-5 animate-in slide-in-from-right">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide">{t("search.filters")}</h3>
                    <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <SearchFilterSidebar facets={results?.facets ?? null} filters={filters} onFilterChange={setFilters} />
                </div>
              )}

              {/* Results */}
              <div className="flex-1 overflow-y-auto">
                <div className={cn("px-4 sm:px-8 lg:px-8 py-6", "flex flex-col gap-6")}>
                  {/* Sattelservice hint */}
                  {query.trim().toLowerCase().includes("sattelservice") && (
                    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 sm:p-5 flex items-start gap-4">
                      <span className="text-2xl flex-shrink-0">🐴</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground mb-1">Sattelservice von Horse&nbsp;&amp;&nbsp;Rider</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Professionelle Sattelanpassung, Sattelberatung und Sattelservice – buchen Sie direkt einen Termin über unsere Sattelservice-Seite.
                        </p>
                        <a
                          href="https://sattelservice.horse-and-rider.de"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          Zum Sattelservice →
                        </a>
                      </div>
                    </div>
                  )}
                  {(isAdvisory || aiResult || aiLoading) && <AIAdvisorPanel result={aiResult} isLoading={aiLoading} query={query} onProductClick={handleProductClick} />}
                  <SearchProductGrid
                    results={filteredResults}
                    isLoading={isLoading}
                    isLoadingMore={isLoadingMore}
                    hasNextPage={hasNextPage && !hasActiveFilters}
                    query={query}
                    onProductClick={handleProductClick}
                    onLoadMore={loadMore}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
