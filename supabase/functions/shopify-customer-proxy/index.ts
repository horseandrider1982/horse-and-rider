/**
 * Proxy for Shopify Customer Account API
 * Solves CORS: browser → this edge function → Shopify API
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_CUSTOMER_API =
  "https://account.horse-and-rider.de/account/customer/api/2025-01/graphql";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, variables, accessToken } = await req.json();

    if (!accessToken) {
      return json({ error: "accessToken required" }, 400);
    }
    if (!query) {
      return json({ error: "query required" }, 400);
    }

    const response = await fetch(SHOPIFY_CUSTOMER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Shopify returned non-JSON:", response.status, text.slice(0, 200));
      return json({ error: `Shopify returned ${response.status}` }, response.status >= 400 ? response.status : 502);
    }

    const data = await response.json();
    return json(data, response.ok ? 200 : response.status);
  } catch (err) {
    console.error("shopify-customer-proxy error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
