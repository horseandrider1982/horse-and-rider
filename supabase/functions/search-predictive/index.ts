import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_API_VERSION = "2025-07";
const SHOPIFY_STORE_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const PRODUCTS_SEARCH_QUERY = `
  query SearchProducts($query: String!, $first: Int!, $after: String) {
    products(first: $first, query: $query, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          collections(first: 5) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
        }
      }
    }
  }
`;

// ── Caches ──────────────────────────────────────────────────────────────
const resultCache = new Map<string, { data: unknown; ts: number }>();
const RESULT_CACHE_TTL = 30_000;

let synonymCache: Map<string, string[]> | null = null;
let synonymCacheTs = 0;
const SYNONYM_CACHE_TTL = 300_000; // 5 min

function getCached(key: string) {
  const entry = resultCache.get(key);
  if (entry && Date.now() - entry.ts < RESULT_CACHE_TTL) return entry.data;
  resultCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  resultCache.set(key, { data, ts: Date.now() });
  if (resultCache.size > 200) {
    const oldest = resultCache.keys().next().value;
    if (oldest) resultCache.delete(oldest);
  }
}

// ── Synonyms ────────────────────────────────────────────────────────────
async function loadSynonyms(): Promise<Map<string, string[]>> {
  if (synonymCache && Date.now() - synonymCacheTs < SYNONYM_CACHE_TTL) {
    return synonymCache;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data, error } = await sb
      .from("search_synonyms")
      .select("term, synonyms")
      .eq("is_active", true);

    if (error) throw error;

    const map = new Map<string, string[]>();
    for (const row of data || []) {
      const term = row.term.toLowerCase();
      map.set(term, row.synonyms.map((s: string) => s.toLowerCase()));
      for (const syn of row.synonyms) {
        const synLower = syn.toLowerCase();
        if (!map.has(synLower)) {
          map.set(synLower, [term]);
        } else {
          const existing = map.get(synLower)!;
          if (!existing.includes(term)) existing.push(term);
        }
      }
    }

    synonymCache = map;
    synonymCacheTs = Date.now();
    return map;
  } catch (err) {
    console.error("Failed to load synonyms:", err);
    return synonymCache || new Map();
  }
}

// ── Query expansion (simplified) ────────────────────────────────────────
// Only apply synonym expansion, skip aggressive German stemming that
// created enormous OR queries breaking Shopify search.
function expandQuery(q: string, synonyms: Map<string, string[]>): string {
  const trimmed = q.trim().toLowerCase();
  const words = trimmed.split(/\s+/);

  // Multi-word queries: don't use OR expansion — Shopify can't parse it reliably.
  // Just return the original query as-is; Shopify full-text search handles it well.
  if (words.length > 1) {
    // Only check full-phrase synonym (e.g. "sattelgurt" → "bauchgurt")
    if (synonyms.has(trimmed)) {
      const syns = synonyms.get(trimmed)!;
      // Return just original + first synonym as OR
      return `${trimmed} OR ${syns[0]}`;
    }
    return trimmed;
  }

  // Single-word queries: safe to expand with OR
  const expandedTerms = new Set<string>();
  expandedTerms.add(trimmed);

  // Synonym expansion
  if (synonyms.has(trimmed)) {
    for (const syn of synonyms.get(trimmed)!) {
      expandedTerms.add(syn);
    }
  }

  // Basic plural/singular variant
  const w = words[0];
  if (w.endsWith("n") && w.length > 3) {
    expandedTerms.add(w.slice(0, -1)); // Trensen → Trense
  } else if (w.endsWith("e") && w.length > 3) {
    expandedTerms.add(w + "n"); // Trense → Trensen
  } else if (w.endsWith("s") && w.length > 3) {
    expandedTerms.add(w.slice(0, -1)); // Halfters → Halfter
  }

  if (expandedTerms.size <= 1) return trimmed;

  const terms = [...expandedTerms].slice(0, 5);
  return terms.join(" OR ");
}

// ── Helpers ─────────────────────────────────────────────────────────────
function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currencyCode,
  }).format(parseFloat(amount));
}

function buildPriceText(
  min: { amount: string; currencyCode: string },
  max: { amount: string; currencyCode: string }
): string {
  const minVal = parseFloat(min.amount);
  const maxVal = parseFloat(max.amount);
  const formatted = formatPrice(min.amount, min.currencyCode);
  return minVal < maxVal ? `ab ${formatted}` : formatted;
}

interface ShopifyEdge {
  node: {
    id: string;
    title: string;
    handle: string;
    vendor: string | null;
    productType: string | null;
    featuredImage: { url: string; altText: string | null } | null;
    priceRange: {
      minVariantPrice: { amount: string; currencyCode: string };
      maxVariantPrice: { amount: string; currencyCode: string };
    };
    collections: {
      edges: Array<{ node: { id: string; title: string; handle: string } }>;
    };
  };
}

// ── Title-relevance scoring ─────────────────────────────────────────────
function scoreProduct(product: ShopifyEdge["node"], queryWords: string[]): number {
  const title = product.title.toLowerCase();
  let score = 0;

  for (const word of queryWords) {
    if (title.includes(word)) score += 10;
  }

  if (queryWords.every((w) => title.includes(w))) score += 20;

  const phrase = queryWords.join(" ");
  if (title.includes(phrase)) score += 30;

  return score;
}

// ── Variant deduplication ───────────────────────────────────────────────
const SIZE_SUFFIXES = new Set([
  "pony", "pony i", "pony ii", "vollblut", "warmblut", "kaltblut",
  "warmblut extra", "cob", "full", "extra full", "mini shetty",
  "shetty", "xs", "s", "m", "l", "xl", "xxl",
]);

function getBaseTitle(title: string): string {
  let t = title.toLowerCase().trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of SIZE_SUFFIXES) {
      if (t.endsWith(` ${suffix}`)) {
        t = t.slice(0, -(suffix.length + 1)).trim();
        changed = true;
        break;
      }
    }
  }
  return t;
}

// ── Main handler ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const after = url.searchParams.get("after") || null;

  if (q.length < 2) {
    return new Response(
      JSON.stringify({ error: "Query must be at least 2 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const cacheKey = `${q.toLowerCase()}|${after || ""}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN") || "d69c81decdb58ced137c44fa1b033aa3";

  const emptyResult = {
    query: q,
    groups: { products: [], articles: [], pages: [] },
    pageInfo: { hasNextPage: false, endCursor: null },
    facets: { vendors: [], collections: [] },
  };

  try {
    const synonyms = await loadSynonyms();
    const expandedQuery = expandQuery(q, synonyms);

    // Fetch more than needed to account for deduplication
    const fetchSize = 48;
    const shopifyQuery = `(${expandedQuery}) available_for_sale:true`;
    const variables: Record<string, unknown> = { query: shopifyQuery, first: fetchSize };
    if (after) variables.after = after;

    console.log("Shopify query:", shopifyQuery);

    const shopifyRes = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: PRODUCTS_SEARCH_QUERY, variables }),
    });

    if (!shopifyRes.ok) {
      console.error("Shopify API error:", shopifyRes.status, await shopifyRes.text());
      return new Response(JSON.stringify(emptyResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyData = await shopifyRes.json();
    if (shopifyData.errors) {
      console.error("Shopify GraphQL errors:", JSON.stringify(shopifyData.errors));
    }

    const productsData = shopifyData.data?.products;
    const edges: ShopifyEdge[] = productsData?.edges || [];
    const pageInfo = productsData?.pageInfo || { hasNextPage: false, endCursor: null };

    // Deduplicate by product ID (OR queries can return duplicates)
    const seenIds = new Set<string>();
    const uniqueEdges: ShopifyEdge[] = [];
    for (const edge of edges) {
      if (!seenIds.has(edge.node.id)) {
        seenIds.add(edge.node.id);
        uniqueEdges.push(edge);
      }
    }

    // Deduplicate variant-as-product entries
    const seenBaseTitles = new Map<string, ShopifyEdge>();
    const deduplicatedEdges: ShopifyEdge[] = [];
    for (const edge of uniqueEdges) {
      const base = getBaseTitle(edge.node.title);
      if (!seenBaseTitles.has(base)) {
        seenBaseTitles.set(base, edge);
        deduplicatedEdges.push(edge);
      }
    }

    // Score and re-sort products by title relevance
    const queryWords = q.trim().toLowerCase().split(/\s+/);
    const scored = deduplicatedEdges.map((edge) => ({
      edge,
      score: scoreProduct(edge.node, queryWords),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Build facets
    const vendorCounts = new Map<string, number>();
    const collectionMap = new Map<string, { title: string; handle: string; count: number }>();

    for (const { edge } of scored) {
      const v = edge.node.vendor;
      if (v) vendorCounts.set(v, (vendorCounts.get(v) || 0) + 1);
      for (const ce of edge.node.collections?.edges || []) {
        const existing = collectionMap.get(ce.node.handle);
        if (existing) existing.count++;
        else collectionMap.set(ce.node.handle, { title: ce.node.title, handle: ce.node.handle, count: 1 });
      }
    }

    const result = {
      query: q,
      groups: {
        products: scored.map(({ edge }) => ({
          id: edge.node.id,
          title: edge.node.title,
          url: `/product/${edge.node.handle}`,
          imageUrl: edge.node.featuredImage?.url || null,
          imageAlt: edge.node.featuredImage?.altText || null,
          priceText: buildPriceText(
            edge.node.priceRange.minVariantPrice,
            edge.node.priceRange.maxVariantPrice
          ),
          vendor: edge.node.vendor || null,
          collections: (edge.node.collections?.edges || []).map((ce) => ({
            title: ce.node.title,
            handle: ce.node.handle,
          })),
        })),
        articles: [],
        pages: [],
      },
      pageInfo: { hasNextPage: pageInfo.hasNextPage, endCursor: pageInfo.endCursor },
      facets: {
        vendors: [...vendorCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        collections: [...collectionMap.values()].sort((a, b) => b.count - a.count),
      },
    };

    setCache(cacheKey, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Search error:", err);
    return new Response(JSON.stringify(emptyResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
