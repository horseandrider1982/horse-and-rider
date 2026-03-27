import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STOREFRONT_URL =
  "https://bpjvam-c1.myshopify.com/api/2025-07/graphql.json";

// Fetch collections directly since menu query requires unauthenticated_read_content scope
const COLLECTIONS_QUERY = `
  query GetCollections($first: Int!, $language: LanguageCode) @inContext(language: $language) {
    collections(first: $first) {
      edges {
        node {
          id
          title
          handle
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { handle, language } = body;

    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    if (!storefrontToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If handle is provided, we try to fetch collections and filter
    // Otherwise fetch all collections as menu items
    const variables: Record<string, unknown> = { first: 50 };
    if (language) variables.language = language.toUpperCase();

    const response = await fetch(SHOPIFY_STOREFRONT_URL, {
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
    
    // Transform collections into menu-like items
    const items = collections.map((edge: { node: { id: string; title: string; handle: string; image?: { url: string; altText: string | null } } }) => ({
      id: edge.node.id,
      title: edge.node.title,
      url: `/collections/${edge.node.handle}`,
      handle: edge.node.handle,
      image: edge.node.image || null,
      items: [], // no sub-items for collections
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
