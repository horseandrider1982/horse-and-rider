import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STOREFRONT_URL =
  "https://bpjvam-c1.myshopify.com/api/2025-07/graphql.json";

const QUERY = `
  query {
    localization {
      availableLanguages {
        isoCode
        endonymName
        name
      }
      language {
        isoCode
        name
      }
    }
  }
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    if (!storefrontToken) {
      return new Response(
        JSON.stringify({ error: "SHOPIFY_STOREFRONT_ACCESS_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({ query: QUERY }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error("Shopify Storefront API errors:", data.errors);
      return new Response(
        JSON.stringify({
          locales: [{ locale: "DE", name: "German", primary: true, published: true }],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const localization = data?.data?.localization;
    const primaryCode = localization?.language?.isoCode || "DE";
    const available = localization?.availableLanguages || [];

    const locales = available.map((l: { isoCode: string; name: string; endonymName: string }) => ({
      locale: l.isoCode,
      name: l.name,
      endonymName: l.endonymName,
      primary: l.isoCode === primaryCode,
      published: true,
    }));

    // Ensure at least German is present
    if (locales.length === 0) {
      locales.push({ locale: "DE", name: "German", endonymName: "Deutsch", primary: true, published: true });
    }

    return new Response(JSON.stringify({ locales }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching Shopify languages:", err);
    return new Response(
      JSON.stringify({
        locales: [{ locale: "DE", name: "German", endonymName: "Deutsch", primary: true, published: true }],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
