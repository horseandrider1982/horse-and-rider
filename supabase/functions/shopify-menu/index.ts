import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOP_DOMAIN = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-07";
const STOREFRONT_API_URL = `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`;

const STOREFRONT_MENU_QUERY = `
  query GetMenu($handle: String!, $language: LanguageCode) @inContext(language: $language) {
    menu(handle: $handle) {
      id
      title
      items {
        id
        title
        url
        items { id title url }
      }
    }
  }
`;

const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $language: LanguageCode) @inContext(language: $language) {
    collections(first: $first) {
      edges {
        node { id title handle }
      }
    }
  }
`;

function extractPath(url: string): string {
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

function normalizeItem(item: any) {
  const path = extractPath(item.url);
  const handleMatch = path.match(/\/collections\/([^/?]+)/);
  return {
    id: item.id,
    title: item.title,
    url: path,
    handle: handleMatch?.[1] || null,
    items: (item.items || []).map(normalizeItem),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, handle, language } = body;
    const locale = (language || "de").toLowerCase();

    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ACTION: list available menus from site_settings
    if (action === "list") {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "shopify_menus")
        .single();
      let menus = [];
      try { menus = JSON.parse(data?.value || "[]"); } catch {}
      return new Response(JSON.stringify({ menus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PRIMARY: Read from DB cache
    if (handle) {
      const { data: cached } = await supabase
        .from("shopify_menu_cache")
        .select("items, synced_at")
        .eq("handle", handle)
        .eq("locale", locale)
        .single();

      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        console.log(`Cache hit for menu "${handle}" locale "${locale}" (${cached.items.length} items, synced ${cached.synced_at})`);
        return new Response(JSON.stringify({ items: cached.items, source: "cache" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // SECONDARY: Try Storefront API menu query
    if (handle && storefrontToken) {
      try {
        const resp = await fetch(STOREFRONT_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": storefrontToken,
          },
          body: JSON.stringify({
            query: STOREFRONT_MENU_QUERY,
            variables: { handle, language: locale.toUpperCase() },
          }),
        });
        const data = await resp.json();
        const menu = data?.data?.menu;
        if (menu?.items?.length) {
          const items = menu.items.map(normalizeItem);
          // Cache for future requests
          await supabase.from("shopify_menu_cache").upsert(
            { handle, locale, items, synced_at: new Date().toISOString() },
            { onConflict: "handle,locale" }
          );
          return new Response(JSON.stringify({ items, source: "api" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.error("Storefront menu query failed:", err);
      }
    }

    // FALLBACK: All collections (only if no specific handle requested or handle not cached)
    if (!storefrontToken) {
      return new Response(JSON.stringify({ items: [], source: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables: Record<string, unknown> = { first: 50 };
    if (language) variables.language = locale.toUpperCase();

    const resp = await fetch(STOREFRONT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: COLLECTIONS_QUERY, variables }),
    });
    const data = await resp.json();
    const collections = data?.data?.collections?.edges || [];
    const items = collections.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      url: `/collections/${e.node.handle}`,
      handle: e.node.handle,
      items: [],
    }));

    return new Response(JSON.stringify({ items, source: "collections_fallback" }), {
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
