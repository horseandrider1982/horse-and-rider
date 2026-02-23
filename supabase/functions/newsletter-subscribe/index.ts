import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SHOPIFY_ACCESS_TOKEN = Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!SHOPIFY_ACCESS_TOKEN) {
      throw new Error("SHOPIFY_ACCESS_TOKEN is not configured");
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Ungültige E-Mail-Adresse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shopDomain = "bpjvam-c1.myshopify.com";
    const adminUrl = `https://${shopDomain}/admin/api/2025-01/customers.json`;

    // Try to create customer with marketing consent
    const createRes = await fetch(adminUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        customer: {
          email: email.trim().toLowerCase(),
          accepts_marketing: true,
          marketing_opt_in_level: "single_opt_in",
        },
      }),
    });

    const data = await createRes.json();

    // If customer already exists, try to update their marketing consent
    if (!createRes.ok && data.errors?.email?.[0]?.includes("has already been taken")) {
      // Search for existing customer
      const searchUrl = `https://${shopDomain}/admin/api/2025-01/customers/search.json?query=email:${encodeURIComponent(email.trim().toLowerCase())}`;
      const searchRes = await fetch(searchUrl, {
        headers: { "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN },
      });
      const searchData = await searchRes.json();
      const existingCustomer = searchData.customers?.[0];

      if (existingCustomer) {
        const updateUrl = `https://${shopDomain}/admin/api/2025-01/customers/${existingCustomer.id}.json`;
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            customer: {
              id: existingCustomer.id,
              accepts_marketing: true,
            },
          }),
        });

        if (!updateRes.ok) {
          const updateData = await updateRes.json();
          console.error("Failed to update customer marketing:", updateData);
          throw new Error("Kunde konnte nicht aktualisiert werden");
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Marketing-Einwilligung aktualisiert" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!createRes.ok) {
      console.error("Shopify customer create error:", data);
      throw new Error(data.errors ? JSON.stringify(data.errors) : "Shopify API-Fehler");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Newsletter-Anmeldung erfolgreich" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
