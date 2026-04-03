import React, { useEffect, useState } from "react";
import { TrendingUp, Tag } from "lucide-react";
import { storefrontApiRequest, STOREFRONT_QUERY } from "@/lib/shopify";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

const POPULAR_SEARCHES = ["Winterdecke", "Schabracke", "Airbagweste", "Reithelm", "Gamaschen", "Turnierbekleidung", "Trense", "Reithose"];
const POPULAR_CATEGORIES = [
  { label: "Pferdedecken", query: "Decke" },
  { label: "Airbagwesten", query: "Airbag" },
  { label: "Schabracken", query: "Schabracke" },
  { label: "Gamaschen", query: "Gamaschen" },
  { label: "Helme", query: "Helm" },
  { label: "Gebisse", query: "Gebiss" },
];

interface TrendingProduct { handle: string; title: string; imageUrl: string | null; price: string; currency: string; vendor: string; }

interface SearchEmptyStateProps { onChipClick: (q: string) => void; onProductClick: (handle: string) => void; }

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({ onChipClick, onProductClick }) => {
  const { t } = useI18n();
  const [trending, setTrending] = useState<TrendingProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, { first: 8 });
        if (cancelled) return;
        setTrending((data?.data?.products?.edges || []).map((e: any) => ({
          handle: e.node.handle, title: e.node.title, imageUrl: e.node.images?.edges?.[0]?.node?.url || null,
          price: e.node.priceRange.minVariantPrice.amount, currency: e.node.priceRange.minVariantPrice.currencyCode, vendor: e.node.vendor || "",
        })));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const formatPrice = (amount: string, currency: string) => new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(parseFloat(amount));

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t("search.popular_categories")}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {POPULAR_CATEGORIES.map(cat => (
            <button key={cat.label} onClick={() => onChipClick(cat.query)} className={cn("px-4 py-3 rounded-xl text-sm font-medium border border-border", "bg-muted/30 text-foreground hover:bg-primary hover:text-primary-foreground", "transition-colors text-center")}>{cat.label}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t("search.popular_categories")}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {POPULAR_CATEGORIES.map(cat => (
            <button key={cat.label} onClick={() => onChipClick(cat.query)} className={cn("px-4 py-3 rounded-xl text-sm font-medium border border-border", "bg-muted/30 text-foreground hover:bg-primary hover:text-primary-foreground", "transition-colors text-center")}>{cat.label}</button>
          ))}
        </div>
      </div>

      {trending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">{t("search.trending_products")}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {trending.map(p => (
              <button key={p.handle} onClick={() => onProductClick(p.handle)} className="group text-left rounded-xl border border-border bg-background hover:shadow-md transition-all overflow-hidden">
                <div className="aspect-square bg-muted overflow-hidden">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">🛍️</div>}
                </div>
                <div className="p-3">
                  {p.vendor && <p className="text-xs text-muted-foreground mb-0.5 truncate">{p.vendor}</p>}
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{formatPrice(p.price, p.currency)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
