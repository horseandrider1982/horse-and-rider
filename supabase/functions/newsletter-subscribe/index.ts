import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";
const STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer { id email }
      customerUserErrors { field message code }
    }
  }
`;

/** Determine a human-readable source tag based on where the signup came from */
function resolveSourceTag(source?: string): string {
  switch (source) {
    case "thankyou":
      return "website-post-checkout";
    case "homepage":
      return "website-homepage";
    case "footer":
      return "website-footer";
    default:
      return "website-newsletter";
  }
}

/** Add or update a contact in Brevo with list assignment and source attribute */
async function syncToBrevo(email: string, sourceTag: string): Promise<void> {
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
  const BREVO_LIST_ID = Deno.env.get("BREVO_NEWSLETTER_LIST_ID");

  if (!BREVO_API_KEY || !BREVO_LIST_ID) {
    console.warn("Brevo credentials not configured – skipping Brevo sync");
    return;
  }

  const listId = Number(BREVO_LIST_ID.trim());
  if (isNaN(listId)) {
    console.error("BREVO_NEWSLETTER_LIST_ID is not a valid number:", BREVO_LIST_ID);
    return;
  }

  // Brevo Contacts API – createContact (or update if exists)
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      listIds: [listId],
      updateEnabled: true, // update existing contacts instead of erroring
      attributes: {
        SIGNUP_SOURCE: sourceTag,
        SIGNUP_DATE: new Date().toISOString().split("T")[0], // YYYY-MM-DD
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Brevo API error ${res.status}:`, body);
  } else {
    console.log(`Brevo: contact synced (${email}) with source=${sourceTag}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STOREFRONT_TOKEN = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    if (!STOREFRONT_TOKEN) {
      throw new Error("SHOPIFY_STOREFRONT_ACCESS_TOKEN is not configured");
    }

    const { email, source } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ success: false, error: "Ungültige E-Mail-Adresse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1) Shopify customer create (for acceptsMarketing)
    const res = await fetch(STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: CUSTOMER_CREATE_MUTATION,
        variables: {
          input: {
            email: cleanEmail,
            acceptsMarketing: true,
          },
        },
      }),
    });

    const data = await res.json();
    const errors = data?.data?.customerCreate?.customerUserErrors || [];

    // "TAKEN" means customer already exists – that's fine
    if (errors.length > 0 && errors[0]?.code !== "TAKEN") {
      console.error("Shopify customerCreate errors:", errors);
      return new Response(
        JSON.stringify({ success: false, error: errors[0]?.message || "Anmeldung fehlgeschlagen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Sync to Brevo with source tag
    const sourceTag = resolveSourceTag(source);
    try {
      await syncToBrevo(cleanEmail, sourceTag);
    } catch (brevoErr) {
      // Don't fail the whole request if Brevo sync fails
      console.error("Brevo sync failed (non-blocking):", brevoErr);
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
