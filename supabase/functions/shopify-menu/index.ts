import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOP_DOMAIN = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-07";
const ADMIN_API_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const STOREFRONT_API_URL = `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`;

// Storefront API menu query — works without special admin permissions
const STOREFRONT_MENU_QUERY = `
  query GetMenu($handle: String!, $language: LanguageCode) @inContext(language: $language) {
    menu(handle: $handle) {
      id
      title
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

const ADMIN_LIST_MENUS_QUERY = `
  query ListMenus {
    menus(first: 50) {
      edges {
        node { id handle title itemsCount }
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

async function storefrontFetch(token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(STOREFRONT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json();
}

async function adminApiFetch(token: string, query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
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

    // ACTION: list all available Shopify menus (admin API)
    if (action === "list") {
      if (!adminToken) {
        return new Response(JSON.stringify({ menus: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await adminApiFetch(adminToken, ADMIN_LIST_MENUS_QUERY);
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

    // PRIMARY: fetch menu by handle via Storefront API
    if (handle && storefrontToken) {
      try {
        const vars: Record<string, unknown> = { handle };
        if (language) vars.language = language.toUpperCase();

        const data = await storefrontFetch(storefrontToken, STOREFRONT_MENU_QUERY, vars);
        const menu = data?.data?.menu;
        if (menu && menu.items?.length) {
          const items = menu.items.map(normalizeMenuItem);
          console.log(`Storefront menu "${handle}" returned ${items.length} items`);
          return new Response(JSON.stringify({ items }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log(`Storefront menu "${handle}" not found or empty, falling back`);
      } catch (err) {
        console.error("Storefront menu query failed:", err);
      }
    }

    // FALLBACK: fetch all collections via Storefront API
    if (!storefrontToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const variables: Record<string, unknown> = { first: 50 };
    if (language) variables.language = language.toUpperCase();

    const data = await storefrontFetch(storefrontToken, COLLECTIONS_QUERY, variables);

    if (data.errors) {
      console.error("Shopify Storefront API errors:", JSON.stringify(data.errors));
      return new Response(JSON.stringify({ items: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const collections = data?.data?.collections?.edges || [];
    const items = collections.map((edge: { node: { id: string; title: string; handle: string } }) => ({
      id: edge.node.id,
      title: edge.node.title,
      url: `/collections/${edge.node.handle}`,
      handle: edge.node.handle,
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
