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
        items {
          id
          title
          url
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

function normalizeMenuItem(item: { id: string; title: string; url: string; items?: any[] }) {
  const path = extractPathFromShopifyUrl(item.url);
  const handleMatch = path.match(/\/collections\/([^/?]+)/);
  return {
    id: item.id,
    title: item.title,
    url: path,
    handle: handleMatch?.[1] || null,
    items: (item.items || []).map((child: any) => normalizeMenuItem(child)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    if (!storefrontToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const menuHandles = handles || ["kategoriemenu", "main-menu", "footer", "hauptmenu-kundenkonto"];
    const menuLocales = locales || ["de", "en"];
    const results: Array<{ handle: string; locale: string; status: string; itemCount?: number }> = [];

    for (const handle of menuHandles) {
      for (const locale of menuLocales) {
        try {
          const response = await fetch(STOREFRONT_API_URL, {
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

          const data = await response.json();
          const menu = data?.data?.menu;

          if (menu && menu.items?.length) {
            const items = menu.items.map(normalizeMenuItem);
            await supabase.from("shopify_menu_cache").upsert(
              { handle, locale, items, synced_at: new Date().toISOString() },
              { onConflict: "handle,locale" }
            );
            results.push({ handle, locale, status: "synced", itemCount: items.length });
          } else {
            const errorMsg = data?.errors?.[0]?.message || "empty";
            results.push({ handle, locale, status: `skipped: ${errorMsg}` });
          }
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
