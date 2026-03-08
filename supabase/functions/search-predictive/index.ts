import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_API_VERSION = "2025-07";
const SHOPIFY_STORE_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const PREDICTIVE_SEARCH_QUERY = `
  query predictiveSearch($query: String!, $limit: Int!, $limitScope: PredictiveSearchLimitScope!) {
    predictiveSearch(query: $query, limit: $limit, limitScope: $limitScope, types: [PRODUCT, ARTICLE, PAGE]) {
      products {
        id
        title
        handle
        vendor
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
      }
      articles {
        id
        title
        handle
        image { url altText }
        excerpt
        blog { handle }
      }
      pages {
        id
        title
        handle
        bodySummary
      }
    }
  }
`;

// Simple in-memory cache (30s TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
  // Evict old entries
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

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

interface NormalizedResult {
  query: string;
  groups: {
    products: Array<{
      id: string;
      title: string;
      url: string;
      imageUrl: string | null;
      imageAlt: string | null;
      priceText: string;
      vendor: string | null;
    }>;
    articles: Array<{
      id: string;
      title: string;
      url: string;
      imageUrl: string | null;
      imageAlt: string | null;
      excerpt: string | null;
    }>;
    pages: Array<{
      id: string;
      title: string;
      url: string;
      excerpt: string | null;
    }>;
  };
}

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

  if (q.length < 2) {
    return new Response(
      JSON.stringify({ error: "Query must be at least 2 characters" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Check cache
  const cacheKey = q.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  if (!storefrontToken) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const shopifyRes = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({
        query: PREDICTIVE_SEARCH_QUERY,
        variables: { query: q, limit: 6, limitScope: "EACH" },
      }),
    });

    if (!shopifyRes.ok) {
      console.error("Shopify API error:", shopifyRes.status);
      const emptyResult: NormalizedResult = {
        query: q,
        groups: { products: [], articles: [], pages: [] },
      };
      return new Response(JSON.stringify(emptyResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyData = await shopifyRes.json();

    if (shopifyData.errors) {
      console.error("Shopify GraphQL errors:", shopifyData.errors);
      // Continue with partial data if predictiveSearch is still present
      if (!shopifyData.data?.predictiveSearch) {
        const emptyResult: NormalizedResult = {
          query: q,
          groups: { products: [], articles: [], pages: [] },
        };
        return new Response(JSON.stringify(emptyResult), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ps = shopifyData.data?.predictiveSearch;

    const result: NormalizedResult = {
      query: q,
      groups: {
        products: (ps?.products || []).slice(0, 6).map(
          (p: {
            id: string;
            title: string;
            handle: string;
            vendor: string | null;
            featuredImage: { url: string; altText: string | null } | null;
            priceRange: {
              minVariantPrice: { amount: string; currencyCode: string };
              maxVariantPrice: { amount: string; currencyCode: string };
            };
          }) => ({
            id: p.id,
            title: p.title,
            url: `/product/${p.handle}`,
            imageUrl: p.featuredImage?.url || null,
            imageAlt: p.featuredImage?.altText || null,
            priceText: buildPriceText(
              p.priceRange.minVariantPrice,
              p.priceRange.maxVariantPrice
            ),
            vendor: p.vendor || null,
          })
        ),
        articles: (ps?.articles || []).slice(0, 3).map(
          (a: {
            id: string;
            title: string;
            handle: string;
            image: { url: string; altText: string | null } | null;
            excerpt: string | null;
            blog: { handle: string } | null;
          }) => ({
            id: a.id,
            title: a.title,
            url: `/blogs/${a.blog?.handle || "news"}/${a.handle}`,
            imageUrl: a.image?.url || null,
            imageAlt: a.image?.altText || null,
            excerpt: a.excerpt
              ? a.excerpt.length > 80
                ? a.excerpt.slice(0, 80) + "…"
                : a.excerpt
              : null,
          })
        ),
        pages: (ps?.pages || []).slice(0, 3).map(
          (p: {
            id: string;
            title: string;
            handle: string;
            bodySummary: string | null;
          }) => ({
            id: p.id,
            title: p.title,
            url: `/pages/${p.handle}`,
            excerpt: p.bodySummary
              ? p.bodySummary.length > 80
                ? p.bodySummary.slice(0, 80) + "…"
                : p.bodySummary
              : null,
          })
        ),
      },
    };

    setCache(cacheKey, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Search error:", err);
    const emptyResult: NormalizedResult = {
      query: q,
      groups: { products: [], articles: [], pages: [] },
    };
    return new Response(JSON.stringify(emptyResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
