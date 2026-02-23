import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_STOREFRONT_TOKEN = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
const SHOPIFY_STORE_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";
const STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const ALL_VENDORS_QUERY = `
  query GetAllVendors($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges { node { vendor } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (c) =>
      ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] || c)
    )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function fetchAllVendors(): Promise<string[]> {
  const vendors = new Set<string>();
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const vars: Record<string, unknown> = { first: 250 };
    if (after) vars.after = after;

    const res = await fetch(STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN!,
      },
      body: JSON.stringify({ query: ALL_VENDORS_QUERY, variables: vars }),
    });

    if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
    const data = await res.json();

    const edges = data?.data?.products?.edges || [];
    for (const edge of edges) {
      const v = edge.node.vendor?.trim();
      if (v) vendors.add(v);
    }
    hasNextPage = data?.data?.products?.pageInfo?.hasNextPage || false;
    after = data?.data?.products?.pageInfo?.endCursor || null;
  }

  return Array.from(vendors);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SHOPIFY_STOREFRONT_TOKEN) {
      throw new Error("SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch all vendors from Shopify
    const vendors = await fetchAllVendors();

    // 2. Fetch existing brands from DB
    const { data: existing } = await supabase
      .from("brands")
      .select("name");
    const existingNames = new Set(
      (existing || []).map((b: { name: string }) => b.name.toLowerCase().trim())
    );

    // 3. Find missing vendors and insert them
    const missing = vendors.filter(
      (v) => !existingNames.has(v.toLowerCase().trim())
    );

    let inserted = 0;
    if (missing.length > 0) {
      const rows = missing.map((name) => ({
        name,
        slug: slugify(name),
        is_active: true,
        featured: false,
      }));

      const { error } = await supabase.from("brands").insert(rows);
      if (error) throw error;
      inserted = rows.length;
    }

    const result = {
      total_vendors: vendors.length,
      existing: existingNames.size,
      inserted,
      missing_vendors: missing,
    };

    console.log("Brand sync complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brand sync error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
