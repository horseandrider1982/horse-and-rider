import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_STORE = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";

const PRODUCTS_QUERY = `
  query ($cursor: String) {
    products(first: 250, after: $cursor, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          handle
          title
          updatedAt
          featuredImage { url }
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query ($cursor: String) {
    collections(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          handle
          title
          updatedAt
          image { url }
        }
      }
    }
  }
`;

async function shopifyFetchAll(token: string, query: string) {
  const results: Array<{ id: string; handle: string; title: string; updatedAt: string; featuredImage?: { url: string } | null; image?: { url: string } | null }> = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext) {
    const res = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({ query, variables: { cursor } }),
      }
    );
    const json = await res.json();
    const root = json.data?.products || json.data?.collections;
    if (!root) break;

    for (const edge of root.edges) {
      results.push(edge.node);
    }
    hasNext = root.pageInfo.hasNextPage;
    cursor = root.pageInfo.endCursor;
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing SHOPIFY_NAVIGATION_TOKEN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats = { products: 0, collections: 0, brands: 0, news: 0, pages: 0 };

  try {
    // 1. Sync Shopify Products
    const products = await shopifyFetchAll(token, PRODUCTS_QUERY);
    stats.products = products.length;

    const productRows = products.map((p: any) => ({
      entity_type: "product" as const,
      entity_id: p.id,
      title: p.title,
      current_path: `/de/product/${p.handle}`,
      canonical_key: `product:${p.id}`,
      is_public: true,
      image_url: p.featuredImage?.url ?? null,
      last_synced_at: new Date().toISOString(),
    }));

    // Batch upsert in chunks of 500
    for (let i = 0; i < productRows.length; i += 500) {
      const chunk = productRows.slice(i, i + 500);
      const { error } = await supabase
        .from("public_routes")
        .upsert(chunk, { onConflict: "canonical_key" });
      if (error) console.error("Product upsert error:", error.message);
    }

    // 2. Sync Shopify Collections
    const collections = await shopifyFetchAll(token, COLLECTIONS_QUERY);
    stats.collections = collections.length;

    const collectionRows = collections.map((c: any) => ({
      entity_type: "collection" as const,
      entity_id: c.id,
      title: c.title,
      current_path: `/de/collections/${c.handle}`,
      canonical_key: `collection:${c.id}`,
      is_public: true,
      image_url: c.image?.url ?? null,
      last_synced_at: new Date().toISOString(),
    }));

    for (let i = 0; i < collectionRows.length; i += 500) {
      const chunk = collectionRows.slice(i, i + 500);
      const { error } = await supabase
        .from("public_routes")
        .upsert(chunk, { onConflict: "canonical_key" });
      if (error) console.error("Collection upsert error:", error.message);
    }

    // 3. Sync Brands from DB
    const { data: brands } = await supabase
      .from("brands")
      .select("id, name, slug, is_active");

    if (brands) {
      stats.brands = brands.length;
      const brandRows = brands.map((b: any) => ({
        entity_type: "brand" as const,
        entity_id: b.id,
        title: b.name,
        current_path: `/de/unsere-marken/${b.slug}`,
        canonical_key: `brand:${b.id}`,
        is_public: b.is_active,
        last_synced_at: new Date().toISOString(),
      }));

      for (let i = 0; i < brandRows.length; i += 500) {
        const chunk = brandRows.slice(i, i + 500);
        const { error } = await supabase
          .from("public_routes")
          .upsert(chunk, { onConflict: "canonical_key" });
        if (error) console.error("Brand upsert error:", error.message);
      }
    }

    // 4. Sync News Articles
    const { data: articles } = await supabase
      .from("news_articles")
      .select("id, title, slug, status, updated_at");

    if (articles) {
      stats.news = articles.length;
      const newsRows = articles.map((a: any) => ({
        entity_type: "news" as const,
        entity_id: a.id,
        title: a.title,
        current_path: `/de/news/${a.slug}`,
        canonical_key: `news:${a.id}`,
        is_public: a.status === "published",
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("public_routes")
        .upsert(newsRows, { onConflict: "canonical_key" });
      if (error) console.error("News upsert error:", error.message);
    }

    // 5. Sync CMS Pages
    const { data: pages } = await supabase
      .from("cms_pages")
      .select("id, title, slug, status, locale")
      .eq("locale", "de");

    if (pages) {
      stats.pages = pages.length;
      const pageRows = pages.map((p: any) => ({
        entity_type: "page" as const,
        entity_id: p.id,
        title: p.title,
        current_path: `/de/${p.slug}`,
        canonical_key: `page:${p.id}`,
        is_public: p.status === "active",
        last_synced_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("public_routes")
        .upsert(pageRows, { onConflict: "canonical_key" });
      if (error) console.error("Pages upsert error:", error.message);
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
