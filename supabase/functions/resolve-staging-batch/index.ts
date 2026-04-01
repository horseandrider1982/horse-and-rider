import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_DOMAIN = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-07";
const BATCH_SIZE = 50;

interface ResolveResult {
  handle: string;
  title: string;
}

async function resolveSkuViaShopify(
  sku: string,
  token: string
): Promise<ResolveResult | null> {
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
    throw new Error(`Shopify API ${res.status}`);
  }

  const data = await res.json();
  const variant = data?.data?.productVariants?.edges?.[0]?.node;

  if (variant?.product) {
    return { handle: variant.product.handle, title: variant.product.title };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
  if (!token) {
    return new Response(
      JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch pending batch
  const { data: pending, error: fetchErr } = await supabase
    .from("redirect_staging")
    .select("id, sku, old_slug")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!pending || pending.length === 0) {
    return new Response(
      JSON.stringify({ message: "No pending SKUs", resolved: 0, not_found: 0, errors: 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let resolved = 0;
  let notFound = 0;
  let errors = 0;
  let redirectsCreated = 0;

  // Process sequentially to respect Shopify rate limits
  for (const row of pending) {
    await (async () => {
        try {
          const result = await resolveSkuViaShopify(row.sku, token);
          const now = new Date().toISOString();

          if (result) {
            // Update staging row
            await supabase
              .from("redirect_staging")
              .update({
                status: "resolved",
                resolved_handle: result.handle,
                resolved_title: result.title,
                resolved_at: now,
              })
              .eq("id", row.id);

            // Create redirect: old_slug -> /product/{handle}
            const oldPath = row.old_slug.startsWith("/")
              ? row.old_slug
              : `/${row.old_slug}`;
            const newPath = `/product/${result.handle}`;

            // Skip if old = new
            if (oldPath.toLowerCase() !== newPath.toLowerCase()) {
              const { error: insertErr } = await supabase.from("redirects").insert({
                old_url: oldPath,
                new_url: newPath,
                old_path: oldPath,
                new_path: newPath,
                entity_type: "product",
                sku: row.sku,
                source: "import_csv",
                is_active: true,
                priority: 50,
              });

              if (!insertErr) {
                // Mark as redirected
                await supabase
                  .from("redirect_staging")
                  .update({ status: "redirected", redirected_at: now })
                  .eq("id", row.id);
                redirectsCreated++;
              } else if (insertErr.code === "23505") {
                // Duplicate - still mark as redirected
                await supabase
                  .from("redirect_staging")
                  .update({ status: "redirected", redirected_at: now })
                  .eq("id", row.id);
              } else {
                console.error(`Redirect insert error for ${row.sku}:`, insertErr);
              }
            } else {
              // Same path, mark as redirected anyway
              await supabase
                .from("redirect_staging")
                .update({ status: "redirected", redirected_at: now })
                .eq("id", row.id);
            }

            resolved++;
          } else {
            await supabase
              .from("redirect_staging")
              .update({ status: "not_found", resolved_at: now })
              .eq("id", row.id);
            notFound++;
          }
        } catch (err) {
          console.error(`Error resolving SKU ${row.sku}:`, err);
          await supabase
            .from("redirect_staging")
            .update({
              status: "error",
              error_message: err.message || String(err),
            })
            .eq("id", row.id);
          errors++;
        }
      })();
  }

  const summary = {
    batch_size: pending.length,
    resolved,
    not_found: notFound,
    errors,
    redirects_created: redirectsCreated,
  };

  console.log("Batch complete:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
