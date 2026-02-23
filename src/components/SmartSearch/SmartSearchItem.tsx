import React from "react";
import type { SearchItem } from "@/types/search";
import { cn } from "@/lib/utils";

interface SmartSearchItemProps {
  item: SearchItem;
  isActive: boolean;
  query: string;
  onMouseEnter: () => void;
  onClick: () => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SmartSearchItem = React.forwardRef<
  HTMLLIElement,
  SmartSearchItemProps
>(({ item, isActive, query, onMouseEnter, onClick }, ref) => {
  const imageUrl =
    item.type === "page" ? null : (item as { imageUrl?: string | null }).imageUrl;
  const imageAlt =
    item.type === "page" ? null : (item as { imageAlt?: string | null }).imageAlt;

  return (
    <li
      ref={ref}
      role="option"
      aria-selected={isActive}
      className={cn(
        "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
        isActive ? "bg-accent" : "hover:bg-accent/50"
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            {item.type === "product" ? "🛍️" : item.type === "article" ? "📄" : "📃"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">
          {highlightMatch(item.title, query)}
        </p>
        {item.type === "product" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.vendor && <span className="truncate">{item.vendor}</span>}
          </div>
        )}
        {(item.type === "article" || item.type === "page") && item.excerpt && (
          <p className="text-xs text-muted-foreground truncate">{item.excerpt}</p>
        )}
      </div>

      {/* Price for products */}
      {item.type === "product" && (
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {item.priceText}
        </span>
      )}
    </li>
  );
});

SmartSearchItem.displayName = "SmartSearchItem";
