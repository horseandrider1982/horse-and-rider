import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-shopify-topic, x-shopify-hmac-sha256, x-shopify-shop-domain, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Shopify Webhook Handler
 *
 * Handles product/update and collection/update webhooks.
 * When a handle changes, auto-creates a redirect from old path to new path
 * and updates entity_paths + public_routes registries.
 *
 * Setup: Register webhooks in Shopify admin pointing to:
 *   POST https://<project>.supabase.co/functions/v1/shopify-webhook
 *
 * Topics supported:
 *   - products/update
 *   - collections/update
 */

async function verifyHmac(body: string, hmacHeader: string): Promise<boolean> {
  const secret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("SHOPIFY_WEBHOOK_SECRET not set – skipping HMAC verification");
    return true; // Allow in dev, but log warning
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

interface ProductPayload {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  variants?: Array<{ sku: string }>;
}

interface CollectionPayload {
  id: number;
  title: string;
  handle: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const topic = req.headers.get("x-shopify-topic") || "";
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const rawBody = await req.text();

  // Verify HMAC
  const valid = await verifyHmac(rawBody, hmac);
  if (!valid) {
    console.error("Invalid HMAC signature");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const payload = JSON.parse(rawBody);

    if (topic === "products/update") {
      await handleProductUpdate(supabase, payload as ProductPayload);
    } else if (topic === "collections/update") {
      await handleCollectionUpdate(supabase, payload as CollectionPayload);
    } else {
      console.log(`Unhandled topic: ${topic}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleProductUpdate(supabase: ReturnType<typeof createClient>, product: ProductPayload) {
  const canonicalKey = `product:${product.id}`;
  const newPath = `/product/${product.handle}`;
  const sku = product.variants?.[0]?.sku || null;

  // Check entity_paths for previous path
  const { data: existingPaths } = await supabase
    .from("entity_paths")
    .select("id, path, is_current")
    .eq("canonical_key", canonicalKey)
    .order("last_seen_at", { ascending: false });

  const currentEntry = existingPaths?.find((p) => p.is_current);

  if (currentEntry && currentEntry.path !== newPath) {
    const oldPath = currentEntry.path;

    // 1. Mark old path as not current
    await supabase
      .from("entity_paths")
      .update({ is_current: false })
      .eq("id", currentEntry.id);

    // 2. Insert new path
    await supabase
      .from("entity_paths")
      .upsert(
        { canonical_key: canonicalKey, path: newPath, is_current: true, last_seen_at: new Date().toISOString() },
        { onConflict: "canonical_key,path" }
      );

    // 3. Create redirect
    await supabase.from("redirects").insert({
      old_url: oldPath,
      new_url: newPath,
      old_path: oldPath,
      new_path: newPath,
      entity_type: "product",
      entity_id: String(product.id),
      canonical_key: canonicalKey,
      sku,
      source: "auto_url_change",
      is_active: true,
      priority: 50,
    });

    console.log(`Redirect created: ${oldPath} → ${newPath} (product ${product.id})`);
  } else if (!currentEntry) {
    // First time seeing this product – just register it
    await supabase.from("entity_paths").insert({
      canonical_key: canonicalKey,
      path: newPath,
      is_current: true,
    });
  } else {
    // Update last_seen_at
    await supabase
      .from("entity_paths")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", currentEntry.id);
  }

  // Update public_routes registry
  await supabase.from("public_routes").upsert(
    {
      entity_type: "product",
      entity_id: String(product.id),
      title: product.title,
      current_path: newPath,
      canonical_key: canonicalKey,
      sku,
      is_public: product.status === "active",
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "canonical_key" }
  );
}

async function handleCollectionUpdate(supabase: ReturnType<typeof createClient>, collection: CollectionPayload) {
  const canonicalKey = `collection:${collection.id}`;
  const newPath = `/collections/${collection.handle}`;

  const { data: existingPaths } = await supabase
    .from("entity_paths")
    .select("id, path, is_current")
    .eq("canonical_key", canonicalKey)
    .order("last_seen_at", { ascending: false });

  const currentEntry = existingPaths?.find((p) => p.is_current);

  if (currentEntry && currentEntry.path !== newPath) {
    const oldPath = currentEntry.path;

    await supabase
      .from("entity_paths")
      .update({ is_current: false })
      .eq("id", currentEntry.id);

    await supabase
      .from("entity_paths")
      .upsert(
        { canonical_key: canonicalKey, path: newPath, is_current: true, last_seen_at: new Date().toISOString() },
        { onConflict: "canonical_key,path" }
      );

    await supabase.from("redirects").insert({
      old_url: oldPath,
      new_url: newPath,
      old_path: oldPath,
      new_path: newPath,
      entity_type: "collection",
      entity_id: String(collection.id),
      canonical_key: canonicalKey,
      source: "auto_url_change",
      is_active: true,
      priority: 50,
    });

    console.log(`Redirect created: ${oldPath} → ${newPath} (collection ${collection.id})`);
  } else if (!currentEntry) {
    await supabase.from("entity_paths").insert({
      canonical_key: canonicalKey,
      path: newPath,
      is_current: true,
    });
  } else {
    await supabase
      .from("entity_paths")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", currentEntry.id);
  }

  await supabase.from("public_routes").upsert(
    {
      entity_type: "collection",
      entity_id: String(collection.id),
      title: collection.title,
      current_path: newPath,
      canonical_key: canonicalKey,
      is_public: true,
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "canonical_key" }
  );
}
