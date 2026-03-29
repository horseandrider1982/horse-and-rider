import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOP_DOMAIN = "bpjvam-c1.myshopify.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const shop = url.searchParams.get("shop") || SHOP_DOMAIN;

  // Step 1: If no code, break out of Shopify iframe and redirect to OAuth
  if (!code) {
    const clientId = Deno.env.get("SHOPIFY_NAV_CLIENT_ID");
    if (!clientId) {
      return new Response("<h1>SHOPIFY_NAV_CLIENT_ID not set</h1>", {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }

    const redirectUri = `${url.origin}${url.pathname}`;
    const scopes = "read_online_store_navigation,write_online_store_navigation";
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Use JavaScript to break out of Shopify's iframe
    return new Response(
      `<!DOCTYPE html>
<html><head><title>Redirecting...</title></head>
<body>
<script>
  if (window.top !== window.self) {
    window.top.location.href = "${authUrl}";
  } else {
    window.location.href = "${authUrl}";
  }
</script>
<p>Weiterleitung zu Shopify OAuth...</p>
</body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Step 2: Exchange code for access token
  const clientId = Deno.env.get("SHOPIFY_NAV_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_NAV_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return new Response("<h1>Client credentials not configured</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return new Response(`<h1>Token exchange failed</h1><pre>${errText}</pre>`, {
        status: 400,
        headers: { "Content-Type": "text/html" },
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    return new Response(
      `<!DOCTYPE html>
<html>
<head><title>Shopify Token</title><style>
  body { font-family: sans-serif; max-width: 600px; margin: 80px auto; background: #111; color: #eee; }
  .token { background: #222; padding: 16px; border-radius: 8px; word-break: break-all; font-family: monospace; font-size: 14px; margin: 16px 0; }
  .info { color: #888; font-size: 13px; }
</style></head>
<body>
  <h1>✅ Token erfolgreich erhalten!</h1>
  <p>Kopiere diesen Token und teile ihn im Lovable-Chat:</p>
  <div class="token">${accessToken}</div>
  <p class="info">Scope: ${tokenData.scope || 'N/A'}</p>
  <p class="info">Dieses Fenster kann geschlossen werden.</p>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return new Response(`<h1>Error</h1><pre>${err.message}</pre>`, {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
});
