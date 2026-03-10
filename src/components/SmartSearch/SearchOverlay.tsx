import React, { useRef, useEffect } from "react";
import { X, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSearchOverlay } from "@/hooks/useSearchOverlay";
import { SearchProductGrid } from "./SearchProductGrid";
import { SearchEmptyState } from "./SearchEmptyState";
import { AIAdvisorPanel } from "./AIAdvisorPanel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const SUGGESTION_CHIPS = [
  "Winterdecke für mein Pferd",
  "Airbagweste für Vielseitigkeit",
  "Samshield Größenberatung",
  "Gebiss für empfindliche Pferde",
  "Gamaschen fürs Gelände",
  "Schabracke Warmblut",
];

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    query,
    results,
    isLoading,
    aiResult,
    aiLoading,
    handleQueryChange,
    reset,
    isAdvisory,
  } = useSearchOverlay();

  const hasResults = (results?.groups?.products?.length ?? 0) > 0;
  const hasQuery = query.trim().length >= 2;

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        reset();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, reset]);

  const handleChipClick = (chip: string) => {
    handleQueryChange(chip);
    inputRef.current?.focus();
  };

  const handleProductClick = (handle: string) => {
    onClose();
    reset();
    navigate(`/product/${handle}`);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Overlay panel */}
      <div
        className={cn(
          "relative z-10 bg-background flex flex-col max-h-full overflow-hidden",
          isMobile
            ? "h-full w-full"
            : "mx-auto mt-0 w-full max-w-full rounded-b-2xl shadow-2xl"
        )}
        style={isMobile ? {} : { maxHeight: "92vh" }}
      >
        {/* Header with search field */}
        <div className="border-b border-border px-4 sm:px-8 lg:px-12 py-4 sm:py-6 flex-shrink-0">
          {/* Top row: branding + close */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary tracking-wide uppercase">
                KI-gestützte Suche & Beratung
              </span>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Suche schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
            Suche nach Produkten, Marken und Kategorien oder stelle konkrete Fragen
            rund um Ausrüstung für Pferd und Reiter. Unsere Suche hilft dir nicht nur
            beim Finden, sondern auch bei der Auswahl passender Produkte.
          </p>

          {/* Search input */}
          <div className="relative max-w-3xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Produkte suchen oder eine Frage stellen …"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className={cn(
                "w-full h-12 sm:h-14 pl-12 pr-12 rounded-xl border-2 bg-background text-base sm:text-lg",
                "text-foreground placeholder:text-muted-foreground",
                "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "transition-all border-border"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  handleQueryChange("");
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Suche leeren"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Suggestion chips - only show when no query */}
          {!hasQuery && (
            <div className="flex flex-wrap gap-2 mt-4">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border border-border",
                    "bg-muted/50 text-foreground hover:bg-primary hover:text-primary-foreground",
                    "transition-colors cursor-pointer"
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {!hasQuery ? (
            <SearchEmptyState onChipClick={handleChipClick} onProductClick={handleProductClick} />
          ) : (
            <div className={cn(
              "px-4 sm:px-8 lg:px-12 py-6",
              "flex flex-col gap-6"
            )}>
              {/* AI Advisor panel */}
              {(isAdvisory || aiResult || aiLoading) && (
                <AIAdvisorPanel
                  result={aiResult}
                  isLoading={aiLoading}
                  query={query}
                  onProductClick={handleProductClick}
                />
              )}

              {/* Product results */}
              <SearchProductGrid
                results={results}
                isLoading={isLoading}
                query={query}
                onProductClick={handleProductClick}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
