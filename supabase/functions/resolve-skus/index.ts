import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Resolve SKUs to parent product handles via Shopify Admin API.
 * POST /resolve-skus { skus: string[] }
 * Returns: { results: Record<string, { handle: string; title: string } | null> }
 */

const SHOPIFY_DOMAIN = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-07";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let skus: string[];
  try {
    const body = await req.json();
    skus = body.skus;
    if (!Array.isArray(skus) || skus.length === 0 || skus.length > 200) {
      throw new Error("skus must be an array of 1-200 strings");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: `Invalid request: ${e.message}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Record<string, { handle: string; title: string } | null> = {};

  // Process in batches of 10 SKUs using productVariants query
  const batchSize = 10;
  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);

    // Use bulk query: search for each SKU
    const promises = batch.map(async (sku) => {
      const query = `
        query {
          productVariants(first: 1, query: "sku:${sku.replace(/"/g, '\\"')}") {
            edges {
              node {
                sku
                product {
                  handle
                  title
                }
              }
            }
          }
        }
      `;

      try {
        const res = await fetch(
          `https://${SHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": token,
            },
            body: JSON.stringify({ query }),
          }
        );

        if (!res.ok) {
          console.error(`Shopify API error for SKU ${sku}: ${res.status}`);
          results[sku] = null;
          return;
        }

        const data = await res.json();
        const variant = data?.data?.productVariants?.edges?.[0]?.node;

        if (variant?.product) {
          results[sku] = {
            handle: variant.product.handle,
            title: variant.product.title,
          };
        } else {
          results[sku] = null;
        }
      } catch (err) {
        console.error(`Error resolving SKU ${sku}:`, err);
        results[sku] = null;
      }
    });

    await Promise.all(promises);
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
