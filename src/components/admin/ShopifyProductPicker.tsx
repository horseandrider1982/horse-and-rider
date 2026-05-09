import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest, STOREFRONT_PAGINATED_QUERY, type ShopifyProduct } from '@/lib/shopify';
import { useI18n } from '@/i18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, Plus, GripVertical, Loader2 } from 'lucide-react';

/**
 * Build a Shopify Storefront search query from free-text input.
 * Splits on whitespace and AND-combines all terms with wildcards,
 * so "uvex helm" matches products containing both "uvex" AND "helm"
 * across title, vendor, product_type, tags, sku.
 * Quoted phrases ("...") are preserved as exact phrases.
 */
function buildShopifyQuery(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const tokens: string[] = [];
  const phraseRegex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = phraseRegex.exec(trimmed)) !== null) {
    tokens.push(`"${match[1]}"`);
  }
  const rest = trimmed.replace(phraseRegex, ' ');

  for (const w of rest.split(/\s+/)) {
    const word = w.trim();
    if (!word) continue;
    if (/^(AND|OR|NOT)$/i.test(word)) continue;
    // Shopify default search treats space as AND across title/vendor/type/tags/sku.
    // Quote each term so it isn't parsed as a field qualifier and to keep special chars safe.
    tokens.push(`"${word.replace(/"/g, '')}"`);
  }

  if (tokens.length === 0) return undefined;
  return tokens.join(' ');
}

/** Fetch ALL pages of products matching the query via cursor pagination */
async function fetchAllProducts(query: string | undefined, language: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  const shopifyQuery = query ? buildShopifyQuery(query) : undefined;

  while (hasNext) {
    const variables: Record<string, unknown> = { first: 250, language };
    if (shopifyQuery) variables.query = shopifyQuery;
    if (cursor) variables.after = cursor;

    const data = await storefrontApiRequest(STOREFRONT_PAGINATED_QUERY, variables);
    const products = data?.data?.products;
    if (!products) break;

    all.push(...(products.edges as ShopifyProduct[]));
    hasNext = products.pageInfo.hasNextPage;
    cursor = products.pageInfo.endCursor;
  }
  return all;
}

interface ShopifyProductPickerProps {
  selectedHandles: string[];
  onChange: (handles: string[]) => void;
}

export function ShopifyProductPicker({ selectedHandles, onChange }: ShopifyProductPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { shopifyLanguage } = useI18n();

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: products, isLoading, isFetching } = useQuery({
    queryKey: ['shopify-products-admin-all', debouncedQuery, shopifyLanguage],
    queryFn: () => fetchAllProducts(debouncedQuery || undefined, shopifyLanguage),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60_000,
  });

  const resultCount = products?.length ?? 0;

  const addProduct = (handle: string) => {
    if (!selectedHandles.includes(handle)) {
      onChange([...selectedHandles, handle]);
    }
  };

  const removeProduct = (handle: string) => {
    onChange(selectedHandles.filter(h => h !== handle));
  };

  const availableProducts = (products || []).filter(
    p => !selectedHandles.includes(p.node.handle)
  );

  return (
    <div className="space-y-4">
      {/* Selected products */}
      {selectedHandles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Ausgewählte Produkte ({selectedHandles.length})</p>
          <div className="space-y-1.5">
            {selectedHandles.map((handle) => (
              <SelectedProductBadge key={handle} handle={handle} onRemove={() => removeProduct(handle)} />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Mehrere Begriffe möglich, z. B. uvex helm'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      <div className="border border-border rounded-md max-h-64 overflow-y-auto">
        {debouncedQuery.length < 2 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Mind. 2 Zeichen eingeben…</p>
        ) : (isLoading || isFetching) ? (
          <div className="p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Lade alle Ergebnisse…</span>
          </div>
        ) : availableProducts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Keine Produkte gefunden.</p>
        ) : (
          <>
            <p className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border bg-muted/10">
              {resultCount} Ergebnis{resultCount !== 1 ? 'se' : ''} gefunden
            </p>
            {availableProducts.map((product) => (
              <ProductRow key={product.node.handle} product={product} onAdd={() => addProduct(product.node.handle)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ProductRow({ product, onAdd }: { product: ShopifyProduct; onAdd: () => void }) {
  const img = product.node.images.edges[0]?.node.url;
  const price = product.node.priceRange.minVariantPrice;

  return (
    <div className="flex items-center gap-3 p-2.5 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      {img ? (
        <img src={img} alt={product.node.title} className="h-10 w-10 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.node.title}</p>
        <p className="text-xs text-muted-foreground">
          {parseFloat(price.amount).toLocaleString('de-DE', { style: 'currency', currency: price.currencyCode })}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SelectedProductBadge({ handle, onRemove }: { handle: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-1.5">
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-sm flex-1 truncate">{handle}</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
