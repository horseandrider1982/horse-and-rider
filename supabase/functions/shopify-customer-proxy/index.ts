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
  "https://shopify.com/103820493125/account/customer/api/2025-01/graphql";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, delay = 1500): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limited (429). Retrying in ${delay}ms… (${retries} left)`);
    await new Promise(r => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
  return response;
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

    const response = await fetchWithRetry(SHOPIFY_CUSTOMER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await response.text();

    // Try to parse as JSON regardless of content-type
    try {
      const data = JSON.parse(text);
      return json(data, response.ok ? 200 : response.status);
    } catch {
      console.error("Shopify returned non-JSON:", response.status, text.slice(0, 300));
      return json({ error: `Shopify returned ${response.status}` }, response.status >= 400 ? response.status : 502);
    }
  } catch (err) {
    console.error("shopify-customer-proxy error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
