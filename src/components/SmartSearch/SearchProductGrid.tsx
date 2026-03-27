import React from "react";
import type { SearchResults } from "@/types/search";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

interface SearchProductGridProps {
  results: SearchResults | null;
  isLoading: boolean;
  query: string;
  onProductClick: (handle: string) => void;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="bg-primary/20 text-foreground rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>;
}

export const SearchProductGrid: React.FC<SearchProductGridProps> = ({ results, isLoading, query, onProductClick }) => {
  const { t } = useI18n();
  const products = results?.groups?.products || [];
  const hasResults = products.length > 0;
  const trimmed = query.trim();

  if (isLoading && !hasResults) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary mr-3" /><span className="text-muted-foreground">{t("search.searching")}</span></div>;
  }

  if (!hasResults && trimmed.length >= 2) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">{t("search.no_products").replace("{query}", trimmed)}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("search.try_different")}</p>
      </div>
    );
  }

  if (!hasResults) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          {t("search.products")}{isLoading && <Loader2 className="inline-block w-4 h-4 animate-spin text-muted-foreground ml-2" />}
        </h3>
        <span className="text-xs text-muted-foreground">{t("search.hits").replace("{count}", String(products.length))}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((product) => {
          const handle = product.url.replace(/^\/product\//, "");
          return (
            <button key={product.id} onClick={() => onProductClick(handle)} className={cn("group text-left rounded-xl border border-border bg-background", "hover:shadow-lg hover:border-primary/30 transition-all duration-200", "overflow-hidden")}>
              <div className="aspect-square bg-muted overflow-hidden">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt || product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-3xl">🛍️</div>}
              </div>
              <div className="p-3">
                {product.vendor && <p className="text-xs text-muted-foreground mb-0.5 truncate uppercase tracking-wider">{product.vendor}</p>}
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">{highlightMatch(product.title, trimmed)}</p>
                <p className="text-sm font-bold text-primary mt-2">{product.priceText}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
