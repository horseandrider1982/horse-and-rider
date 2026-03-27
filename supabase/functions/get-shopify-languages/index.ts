import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_ADMIN_URL =
  "https://bpjvam-c1.myshopify.com/admin/api/2025-07/graphql.json";

const QUERY = `
  query {
    shopLocales {
      locale
      name
      primary
      published
    }
  }
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyToken = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!shopifyToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_ACCESS_TOKEN not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch(SHOPIFY_ADMIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": shopifyToken,
      },
      body: JSON.stringify({ query: QUERY }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify Admin API errors:", data.errors);
      return new Response(
        JSON.stringify({
          locales: [{ locale: "DE", name: "German", primary: true, published: true }],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only return published locales
    const locales = (data?.data?.shopLocales || []).filter(
      (l: { published: boolean }) => l.published
    );

    return new Response(JSON.stringify({ locales }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching Shopify languages:", err);
    return new Response(
      JSON.stringify({
        locales: [{ locale: "DE", name: "German", primary: true, published: true }],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
