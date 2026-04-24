// Discover available metafield definitions in the xentral_props namespace
// Reads Metafield Definitions API from Shopify Admin and upserts entries
// into product_property_display_config.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";
const NAMESPACE = "xentral_props";

interface MetafieldDefinition {
  id: string;
  key: string;
  namespace: string;
  name: string;
  description?: string | null;
  type: { name: string };
  ownerType: string;
}

const DEF_QUERY = `
  query GetDefs($ownerType: MetafieldOwnerType!, $namespace: String!, $after: String) {
    metafieldDefinitions(first: 100, ownerType: $ownerType, namespace: $namespace, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          key
          namespace
          name
          description
          type { name }
          ownerType
        }
      }
    }
  }
`;

async function fetchDefs(
  token: string,
  ownerType: "PRODUCT" | "PRODUCTVARIANT",
): Promise<MetafieldDefinition[]> {
  const all: MetafieldDefinition[] = [];
  let after: string | null = null;
  do {
    const resp = await fetch(
      `https://${SHOPIFY_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query: DEF_QUERY,
          variables: { ownerType, namespace: NAMESPACE, after },
        }),
      },
    );
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(
        `Shopify Admin API error ${resp.status}: ${txt.slice(0, 200)}`,
      );
    }
    const json = await resp.json();
    if (json.errors) {
      throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 200)}`);
    }
    const edges = json?.data?.metafieldDefinitions?.edges ?? [];
    for (const e of edges) all.push(e.node as MetafieldDefinition);
    const pageInfo = json?.data?.metafieldDefinitions?.pageInfo;
    after = pageInfo?.hasNextPage ? pageInfo.endCursor : null;
  } while (after);
  return all;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMm\b/g, "(mm)")
    .replace(/\bCm\b/g, "(cm)")
    .replace(/\bKg\b/g, "(kg)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN");
    if (!token) throw new Error("SHOPIFY_NAVIGATION_TOKEN not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: only admins may invoke this discovery.
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin via Supabase
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: serviceKey },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await userResp.json();
    const roleResp = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    const roles = await roleResp.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch definitions for product + variant
    const productDefs = await fetchDefs(token, "PRODUCT");
    const variantDefs = await fetchDefs(token, "PRODUCTVARIANT");

    // Merge by key
    const byKey = new Map<string, MetafieldDefinition>();
    for (const d of [...productDefs, ...variantDefs]) {
      if (!byKey.has(d.key)) byKey.set(d.key, d);
    }

    const definitions = Array.from(byKey.values());

    // Get existing config keys
    const existingResp = await fetch(
      `${supabaseUrl}/rest/v1/product_property_display_config?select=shopify_key,display_order&shopify_namespace=eq.${NAMESPACE}`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    const existing: { shopify_key: string; display_order: number }[] =
      await existingResp.json();
    const existingKeys = new Set(existing.map((e) => e.shopify_key));
    const maxOrder = existing.reduce(
      (m, e) => Math.max(m, e.display_order ?? 0),
      0,
    );

    // Insert new ones
    const toInsert = definitions
      .filter((d) => !existingKeys.has(d.key))
      .map((d, i) => ({
        shopify_namespace: NAMESPACE,
        shopify_key: d.key,
        label: d.name || humanizeKey(d.key),
        is_active: true,
        display_order: maxOrder + 1 + i,
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const ins = await fetch(
        `${supabaseUrl}/rest/v1/product_property_display_config`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(toInsert),
        },
      );
      if (!ins.ok) {
        const t = await ins.text();
        throw new Error(`Insert failed: ${t.slice(0, 200)}`);
      }
      const created = await ins.json();
      inserted = Array.isArray(created) ? created.length : 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        discovered: definitions.length,
        inserted,
        keys: definitions.map((d) => ({
          key: d.key,
          name: d.name,
          ownerType: d.ownerType,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("discover-xentral-props error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
