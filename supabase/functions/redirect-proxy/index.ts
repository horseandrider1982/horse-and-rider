import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * 301-Redirect-Proxy
 *
 * Returns real HTTP 301 responses for SEO crawlers.
 * Usage: GET /redirect-proxy?path=/old-url
 *
 * Resolves redirect chains (max 5 hops) and returns:
 * - 301 with Location header if redirect found
 * - 404 if no redirect exists
 */

const MAX_HOPS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path");

  if (!path) {
    return new Response(JSON.stringify({ error: "Missing ?path= parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Normalize path
    let normalizedPath = path.toLowerCase().replace(/\/+/g, "/");
    if (normalizedPath.length > 1) normalizedPath = normalizedPath.replace(/\/+$/, "");
    if (!normalizedPath.startsWith("/")) normalizedPath = "/" + normalizedPath;

    // Resolve chain
    let currentPath = normalizedPath;
    let hops = 0;
    const visited = new Set([normalizedPath]);
    let firstRedirectId: string | null = null;

    while (hops < MAX_HOPS) {
      const { data } = await supabase
        .from("redirects")
        .select("id, new_path, new_url")
        .eq("old_path", currentPath)
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data) break;

      const target = data.new_path || data.new_url;
      if (!target || visited.has(target)) break;

      if (hops === 0) firstRedirectId = data.id;
      visited.add(target);
      currentPath = target;
      hops++;
    }

    if (currentPath === normalizedPath) {
      return new Response(JSON.stringify({ error: "No redirect found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log hit asynchronously (fire and forget)
    if (firstRedirectId) {
      const today = new Date().toISOString().split("T")[0];
      supabase
        .from("redirect_hits")
        .upsert(
          { redirect_id: firstRedirectId, old_path: normalizedPath, new_path: currentPath, day: today, hits: 1 },
          { onConflict: "redirect_id,day" }
        )
        .then(() => {});
    }

    // Return real 301
    return new Response(null, {
      status: 301,
      headers: {
        ...corsHeaders,
        Location: currentPath,
        "Cache-Control": "public, max-age=3600",
        "X-Redirect-Hops": String(hops),
      },
    });
  } catch (err) {
    console.error("Redirect proxy error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
