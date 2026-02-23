import React from "react";
import type { SearchResults, SearchItem } from "@/types/search";
import { SmartSearchItem } from "./SmartSearchItem";
import { Loader2 } from "lucide-react";

interface SmartSearchDropdownProps {
  results: SearchResults | null;
  query: string;
  isLoading: boolean;
  activeIndex: number;
  flatItems: SearchItem[];
  itemRefs: React.MutableRefObject<(HTMLLIElement | null)[]>;
  onHoverIndex: (index: number) => void;
  onSelectItem: (item: SearchItem) => void;
  onViewAll: () => void;
}

const SECTION_LABELS: Record<string, string> = {
  products: "Produkte",
  articles: "Artikel",
  pages: "Seiten",
};

export const SmartSearchDropdown: React.FC<SmartSearchDropdownProps> = ({
  results,
  query,
  isLoading,
  activeIndex,
  flatItems,
  itemRefs,
  onHoverIndex,
  onSelectItem,
  onViewAll,
}) => {
  const hasResults = flatItems.length > 0;
  const trimmedQuery = query.trim();

  if (isLoading && !hasResults) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Suche…</span>
      </div>
    );
  }

  if (!hasResults && trimmedQuery.length >= 2) {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">
        Keine Treffer für „{trimmedQuery}"
      </div>
    );
  }

  // Build sections with global index tracking
  let globalIndex = 0;
  const sections: Array<{ key: string; label: string; startIndex: number; items: SearchItem[] }> = [];

  for (const key of ["products", "articles", "pages"] as const) {
    const groupItems = results?.groups[key] || [];
    if (groupItems.length === 0) continue;

    const typed: SearchItem[] = groupItems.map((item) => ({
      ...item,
      type: key === "products" ? "product" : key === "articles" ? "article" : "page",
    })) as SearchItem[];

    sections.push({
      key,
      label: SECTION_LABELS[key],
      startIndex: globalIndex,
      items: typed,
    });
    globalIndex += typed.length;
  }

  return (
    <>
      <ul role="listbox" className="max-h-[420px] overflow-y-auto py-1">
        {sections.map((section) => (
          <li key={section.key} role="presentation">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.label}
            </div>
            <ul role="group" aria-label={section.label}>
              {section.items.map((item, i) => {
                const flatIndex = section.startIndex + i;
                return (
                  <SmartSearchItem
                    key={item.id}
                    ref={(el) => {
                      itemRefs.current[flatIndex] = el;
                    }}
                    item={item}
                    isActive={flatIndex === activeIndex}
                    query={trimmedQuery}
                    onMouseEnter={() => onHoverIndex(flatIndex)}
                    onClick={() => onSelectItem(item)}
                  />
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {/* View all CTA */}
      {hasResults && (
        <button
          type="button"
          onClick={onViewAll}
          className="w-full px-3 py-2.5 text-sm font-medium text-primary hover:bg-accent/50 transition-colors border-t border-border text-center"
        >
          Alle Ergebnisse anzeigen →
        </button>
      )}

      {/* Loading indicator when results exist but new query is loading */}
      {isLoading && hasResults && (
        <div className="absolute top-2 right-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </>
  );
};
