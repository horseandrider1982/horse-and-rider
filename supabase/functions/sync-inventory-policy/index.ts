import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_STORE = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";

// Query variants with their metafields and inventory item info
// Metafields ueberverkauf/lieferantenbestand live on the PRODUCT, not the variant.
const VARIANTS_QUERY = `
  query ($cursor: String) {
    productVariants(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          inventoryPolicy
          inventoryItem { id }
          product {
            ueberverkauf: metafield(namespace: "custom", key: "ueberverkauf") { value }
            lieferantenbestand: metafield(namespace: "custom", key: "lieferantenbestand") { value }
          }
        }
      }
    }
  }
`;

const UPDATE_VARIANT_MUTATION = `
  mutation ($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant { id inventoryPolicy }
      userErrors { field message }
    }
  }
`;

interface VariantNode {
  id: string;
  inventoryPolicy: string;
  inventoryItem: { id: string };
  ueberverkauf: { value: string } | null;
  lieferantenbestand: { value: string } | null;
}

async function shopifyAdmin(token: string, query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stats = { checked: 0, updated_continue: 0, updated_deny: 0, errors: 0 };

  try {
    let cursor: string | null = null;
    let hasNext = true;

    while (hasNext) {
      const json = await shopifyAdmin(token, VARIANTS_QUERY, { cursor });
      const root = json.data?.productVariants;
      if (!root) {
        console.error("Query failed:", JSON.stringify(json.errors || json));
        break;
      }

      for (const edge of root.edges) {
        const variant: VariantNode = edge.node;
        stats.checked++;

        const ueberverkauf = variant.ueberverkauf?.value;
        const lieferantenbestand = parseInt(variant.lieferantenbestand?.value || "0") || 0;

        // Desired policy: CONTINUE if oversell enabled AND supplier stock > 0
        const shouldContinue = ueberverkauf === "1" && lieferantenbestand > 0;
        const currentPolicy = variant.inventoryPolicy; // "CONTINUE" or "DENY"

        if (shouldContinue && currentPolicy !== "CONTINUE") {
          const result = await shopifyAdmin(token, UPDATE_VARIANT_MUTATION, {
            input: { id: variant.id, inventoryPolicy: "CONTINUE" },
          });
          if (result.data?.productVariantUpdate?.userErrors?.length > 0) {
            console.error("Update error:", result.data.productVariantUpdate.userErrors);
            stats.errors++;
          } else {
            stats.updated_continue++;
            console.log(`Set CONTINUE: ${variant.id}`);
          }
        } else if (!shouldContinue && currentPolicy === "CONTINUE") {
          // Revert to DENY if oversell conditions no longer met
          const result = await shopifyAdmin(token, UPDATE_VARIANT_MUTATION, {
            input: { id: variant.id, inventoryPolicy: "DENY" },
          });
          if (result.data?.productVariantUpdate?.userErrors?.length > 0) {
            console.error("Update error:", result.data.productVariantUpdate.userErrors);
            stats.errors++;
          } else {
            stats.updated_deny++;
            console.log(`Set DENY: ${variant.id}`);
          }
        }
      }

      hasNext = root.pageInfo.hasNextPage;
      cursor = root.pageInfo.endCursor;
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
