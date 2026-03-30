import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
  if (!storefrontToken) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const emptyResult = {
    query: q,
    groups: { products: [], articles: [], pages: [] },
    pageInfo: { hasNextPage: false, endCursor: null },
    facets: { vendors: [], collections: [] },
  };

  try {
    const variables: Record<string, unknown> = { query: q, first: 24 };
    if (after) variables.after = after;

    const shopifyRes = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: PRODUCTS_SEARCH_QUERY, variables }),
    });

    if (!shopifyRes.ok) {
      console.error("Shopify API error:", shopifyRes.status);
      return new Response(JSON.stringify(emptyResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shopifyData = await shopifyRes.json();
    if (shopifyData.errors) {
      console.error("Shopify GraphQL errors:", shopifyData.errors);
    }

    const productsData = shopifyData.data?.products;
    const edges: ShopifyEdge[] = productsData?.edges || [];
    const pageInfo = productsData?.pageInfo || { hasNextPage: false, endCursor: null };

    // Build facets
    const vendorCounts = new Map<string, number>();
    const collectionMap = new Map<string, { title: string; handle: string; count: number }>();

    for (const edge of edges) {
      const v = edge.node.vendor;
      if (v) vendorCounts.set(v, (vendorCounts.get(v) || 0) + 1);

      for (const ce of edge.node.collections?.edges || []) {
        const existing = collectionMap.get(ce.node.handle);
        if (existing) {
          existing.count++;
        } else {
          collectionMap.set(ce.node.handle, { title: ce.node.title, handle: ce.node.handle, count: 1 });
        }
      }
    }

    const vendors = [...vendorCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const collections = [...collectionMap.values()]
      .sort((a, b) => b.count - a.count);

    const result = {
      query: q,
      groups: {
        products: edges.map((edge) => ({
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
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage,
        endCursor: pageInfo.endCursor,
      },
      facets: { vendors, collections },
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
