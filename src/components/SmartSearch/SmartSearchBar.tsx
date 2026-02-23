import React, { useRef, useCallback, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { SmartSearchDropdown } from "./SmartSearchDropdown";
import type { SearchItem } from "@/types/search";
import { cn } from "@/lib/utils";

export const SmartSearchBar: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const { query, results, isLoading, isOpen, handleQueryChange, close, open } =
    useSmartSearch();

  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const dropdownId = "smart-search-dropdown";

  // Build flat list of items for keyboard navigation
  const flatItems = useMemo<SearchItem[]>(() => {
    if (!results) return [];
    const items: SearchItem[] = [];
    for (const p of results.groups.products) items.push({ ...p, type: "product" });
    for (const a of results.groups.articles) items.push({ ...a, type: "article" });
    for (const pg of results.groups.pages) items.push({ ...pg, type: "page" });
    return items;
  }, [results]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = new Array(flatItems.length).fill(null);
  }, [flatItems]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      close();
      navigate(item.url);
    },
    [close, navigate]
  );

  const handleViewAll = useCallback(() => {
    close();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [close, navigate, query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev < flatItems.length - 1 ? prev + 1 : 0;
            itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => {
            const next = prev > 0 ? prev - 1 : flatItems.length - 1;
            itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < flatItems.length) {
            handleSelect(flatItems[activeIndex]);
          } else if (query.trim().length >= 2) {
            handleViewAll();
          }
          break;
        case "Escape":
          e.preventDefault();
          close();
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, activeIndex, flatItems, handleSelect, handleViewAll, query, close]
  );

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `search-item-${activeIndex}` : undefined
          }
          placeholder="Suche…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={open}
          onKeyDown={handleKeyDown}
          className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              handleQueryChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Suche leeren"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          id={dropdownId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg z-[100] overflow-hidden"
        >
          <SmartSearchDropdown
            results={results}
            query={query}
            isLoading={isLoading}
            activeIndex={activeIndex}
            flatItems={flatItems}
            itemRefs={itemRefs}
            onHoverIndex={setActiveIndex}
            onSelectItem={handleSelect}
            onViewAll={handleViewAll}
          />
        </div>
      )}
    </div>
  );
};
