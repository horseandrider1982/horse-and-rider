import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOP_DOMAIN = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-07";
const ADMIN_API_URL = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Admin API: list all menus to find GIDs by handle
const ADMIN_MENUS_LIST_QUERY = `
  query ListMenus {
    menus(first: 50) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;

// Admin API query – fetches a menu by ID with nested items
const ADMIN_MENU_QUERY = `
  query GetMenu($id: ID!) {
    menu(id: $id) {
      id
      title
      handle
      items(limit: 250) {
        id
        title
        url
        tags
        items {
          id
          title
          url
          tags
          items {
            id
            title
            url
          }
        }
      }
    }
  }
`;

// Admin API: fetch available translations for a menu
const ADMIN_TRANSLATABLE_QUERY = `
  query GetTranslations($resourceId: ID!, $locale: String!) {
    translatableResource(resourceId: $resourceId) {
      translations(locale: $locale) {
        key
        value
      }
    }
  }
`;

function extractPathFromShopifyUrl(url: string): string {
  if (!url) return "/";
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

interface RawMenuItem {
  id: string;
  title: string;
  url: string;
  items?: RawMenuItem[];
}

function normalizeMenuItem(item: RawMenuItem) {
  const path = extractPathFromShopifyUrl(item.url);
  const handleMatch = path.match(/\/collections\/([^/?]+)/);
  const children = item.items || [];
  return {
    id: item.id,
    title: item.title,
    url: path,
    handle: handleMatch?.[1] || null,
    items: children.map((child) => normalizeMenuItem(child)),
  };
}

async function adminApiRequest(query: string, variables: Record<string, unknown>, accessToken: string) {
  const response = await fetch(ADMIN_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error(`Admin API HTTP ${response.status}: ${text}`);
    throw new Error(`Admin API ${response.status}: ${text}`);
  }
  const json = await response.json();
  if (json.errors) {
    console.error(`Admin API GraphQL errors:`, JSON.stringify(json.errors));
  }
  return json;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role if auth header present
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { handles, locales } = body;

    // Prefer dedicated navigation token, fall back to general access token
    const accessToken = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_NAVIGATION_TOKEN or SHOPIFY_ACCESS_TOKEN not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Using token:", accessToken.startsWith("shpat_") ? "shpat_***" : "***");

    const menuHandles: string[] = handles || ["kategoriemenu", "main-menu", "footer", "hauptmenu-kundenkonto", "gebisse-menu", "barbour-menu"];
    const menuLocales: string[] = locales || ["de", "en"];
    const results: Array<{ handle: string; locale: string; status: string; itemCount?: number }> = [];
    const handleAliases = new Map<string, string>([["hauptmenu-kundenkonto", "customer-account-main-menu"]]);

    // First, list all menus to build a handle→GID map
    const handleToGid = new Map<string, string>();
    try {
      const listData = await adminApiRequest(ADMIN_MENUS_LIST_QUERY, {}, accessToken);
      const menuEdges = listData?.data?.menus?.edges || [];
      for (const edge of menuEdges) {
        handleToGid.set(edge.node.handle, edge.node.id);
      }
      console.log("Available menus:", Array.from(handleToGid.keys()).join(", "));
    } catch (err) {
      return new Response(JSON.stringify({ error: `Failed to list menus: ${err.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const handle of menuHandles) {
      let defaultItems: ReturnType<typeof normalizeMenuItem>[] = [];
      const resolvedHandle = handleToGid.has(handle) ? handle : (handleAliases.get(handle) || handle);
      let menuGid: string | null = handleToGid.get(resolvedHandle) || null;

      if (!menuGid) {
        for (const locale of menuLocales) {
          results.push({ handle, locale, status: `skipped: menu not found (${resolvedHandle})` });
        }
        continue;
      }

      try {
        const data = await adminApiRequest(ADMIN_MENU_QUERY, { id: menuGid }, accessToken);
        console.log(`Menu "${handle}" response:`, JSON.stringify(data?.data?.menu ? { id: data.data.menu.id, title: data.data.menu.title, itemCount: data.data.menu.items?.length } : null));
        if (data?.errors) {
          console.error(`GraphQL errors for "${handle}":`, JSON.stringify(data.errors));
        }
        const menu = data?.data?.menu;

        if (!menu || !menu.items?.length) {
          for (const locale of menuLocales) {
            results.push({ handle, locale, status: `skipped: menu ${menu ? 'empty' : 'not found'}` });
          }
          continue;
        }

        defaultItems = menu.items.map((item: RawMenuItem) => normalizeMenuItem(item));
      } catch (err) {
        for (const locale of menuLocales) {
          results.push({ handle, locale, status: `error: ${err.message}` });
        }
        continue;
      }

      // Save default locale (de)
      for (const locale of menuLocales) {
        try {
          let items = defaultItems;

          // For non-default locales, try to get translations
          if (locale !== "de" && menuGid) {
            try {
              // Attempt to fetch translations for menu items via Shopify Translate & Adapt
              // For now, we store the same structure – titles can be overridden manually in the admin
              // The Admin API translations endpoint requires the Translate & Adapt app
              const transData = await adminApiRequest(ADMIN_TRANSLATABLE_QUERY, {
                resourceId: menuGid,
                locale,
              }, accessToken);

              const translations = transData?.data?.translatableResource?.translations;
              if (translations && translations.length > 0) {
                // Build a map of translation keys to values
                const transMap = new Map<string, string>();
                translations.forEach((t: { key: string; value: string }) => {
                  if (t.value) transMap.set(t.key, t.value);
                });

                // Apply translations to items (title keys follow pattern)
                items = defaultItems.map((item, idx) => ({
                  ...item,
                  title: transMap.get(`items.${idx}.title`) || transMap.get(item.title) || item.title,
                  items: item.items.map((child: any, cidx: number) => ({
                    ...child,
                    title: transMap.get(`items.${idx}.items.${cidx}.title`) || child.title,
                  })),
                }));
              }
            } catch {
              // Translation fetch failed – use default titles
            }
          }

          await supabase.from("shopify_menu_cache").upsert(
            { handle, locale, items, synced_at: new Date().toISOString() },
            { onConflict: "handle,locale" }
          );
          results.push({ handle, locale, status: "synced", itemCount: items.length });
        } catch (err) {
          results.push({ handle, locale, status: `error: ${err.message}` });
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
