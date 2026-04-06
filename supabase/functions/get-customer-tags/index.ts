import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHOPIFY_STORE = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-01";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated (either Shopify customer or admin)
    const authHeader = req.headers.get("authorization");
    const { shopify_customer_id } = await req.json();

    if (!shopify_customer_id) {
      return new Response(
        JSON.stringify({ error: "shopify_customer_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract numeric ID from GID (e.g. "gid://shopify/Customer/12345" -> "12345")
    const numericId = shopify_customer_id.replace(/^gid:\/\/shopify\/Customer\//, "");

    const token = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "No Shopify admin token configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Shopify Admin API for customer tags
    const query = `
      query GetCustomerTags($id: ID!) {
        customer(id: $id) {
          tags
        }
      }
    `;

    const response = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token,
        },
        body: JSON.stringify({
          query,
          variables: { id: `gid://shopify/Customer/${numericId}` },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Shopify Admin API error:", errText);
      return new Response(
        JSON.stringify({ error: "Shopify API error", tags: [] }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const allTags: string[] = data?.data?.customer?.tags || [];

    // Filter tags containing "Card" (case-insensitive)
    const cardTags = allTags.filter((t: string) =>
      t.toLowerCase().includes("card")
    );

    return new Response(
      JSON.stringify({ tags: allTags, cardTags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-customer-tags error:", err);
    return new Response(
      JSON.stringify({ error: err.message, tags: [], cardTags: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
