import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOP_DOMAIN = "bpjvam-c1.myshopify.com";
const ADMIN_API_VERSION = "2025-07";
const ADMIN_API_URL = `https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
const STOREFRONT_API_URL = `https://${SHOP_DOMAIN}/api/${ADMIN_API_VERSION}/graphql.json`;

const ADMIN_LIST_MENUS_QUERY = `
  query ListMenus {
    menus(first: 50) {
      edges {
        node {
          id
          handle
          title
          itemsCount
        }
      }
    }
  }
`;

const ADMIN_MENU_BY_HANDLE_QUERY = `
  query GetMenu($handle: String!) {
    menuByHandle(handle: $handle) {
      id
      title
      handle
      items {
        id
        title
        url
        items {
          id
          title
          url
        }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $language: LanguageCode) @inContext(language: $language) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          image { url altText }
        }
      }
    }
  }
`;

function extractPathFromShopifyUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("myshopify.com") || u.hostname.includes("shopify.com")) {
      return u.pathname + u.search;
    }
    return url;
  } catch {
    return url;
  }
}

function normalizeMenuItem(item: { id: string; title: string; url: string; items?: { id: string; title: string; url: string }[] }) {
  const path = extractPathFromShopifyUrl(item.url);
  const handleMatch = path.match(/\/collections\/([^/?]+)/);
  return {
    id: item.id,
    title: item.title,
    url: path,
    handle: handleMatch?.[1] || null,
    items: (item.items || []).map(child => normalizeMenuItem(child)),
  };
}

async function adminApiFetch(adminToken: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": adminToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, handle, language } = body;

    const adminToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

    // ACTION: list all available Shopify menus
    if (action === "list") {
      if (!adminToken) {
        return new Response(JSON.stringify({ menus: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await adminApiFetch(adminToken, ADMIN_LIST_MENUS_QUERY);
      if (data.errors) {
        console.error("Admin API list menus errors:", JSON.stringify(data.errors));
        return new Response(JSON.stringify({ menus: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const menus = (data?.data?.menus?.edges || []).map((e: { node: { id: string; handle: string; title: string; itemsCount: number } }) => ({
        id: e.node.id,
        handle: e.node.handle,
        title: e.node.title,
        itemsCount: e.node.itemsCount,
      }));
      return new Response(JSON.stringify({ menus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: get menu items by handle
    if (handle && adminToken) {
      try {
        const data = await adminApiFetch(adminToken, ADMIN_MENU_BY_HANDLE_QUERY, { handle });
        const menu = data?.data?.menuByHandle;
        if (menu) {
          const items = (menu.items || []).map(normalizeMenuItem);
          return new Response(JSON.stringify({ items }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log(`Menu "${handle}" not found via Admin API, falling back to collections`);
      } catch (err) {
        console.error("Admin API menu query failed:", err);
      }
    }

    // Fallback: fetch all collections via Storefront API
    if (!storefrontToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const variables: Record<string, unknown> = { first: 50 };
    if (language) variables.language = language.toUpperCase();

    const response = await fetch(STOREFRONT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: COLLECTIONS_QUERY, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify Storefront API errors:", JSON.stringify(data.errors));
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const collections = data?.data?.collections?.edges || [];
    const items = collections.map((edge: { node: { id: string; title: string; handle: string; image?: { url: string; altText: string | null } } }) => ({
      id: edge.node.id,
      title: edge.node.title,
      url: `/collections/${edge.node.handle}`,
      handle: edge.node.handle,
      image: edge.node.image || null,
      items: [],
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
