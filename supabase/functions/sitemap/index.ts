import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Sitemap Generator
 *
 * Returns an XML sitemap built from public_routes.
 * GET /sitemap → application/xml
 *
 * Query params:
 *   ?base=https://example.com  (required – your public domain)
 */

const PRIORITY_MAP: Record<string, string> = {
  product: "0.8",
  collection: "0.7",
  brand: "0.6",
  news: "0.6",
  page: "0.5",
  custom: "0.4",
};

const CHANGEFREQ_MAP: Record<string, string> = {
  product: "weekly",
  collection: "weekly",
  brand: "monthly",
  news: "monthly",
  page: "yearly",
  custom: "monthly",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const base = url.searchParams.get("base");

  if (!base) {
    return new Response(
      JSON.stringify({ error: "Missing ?base= parameter (e.g. ?base=https://example.com)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const baseUrl = base.replace(/\/+$/, "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: routes, error } = await supabase
      .from("public_routes")
      .select("current_path, entity_type, updated_at")
      .eq("is_public", true)
      .order("entity_type")
      .order("current_path");

    if (error) throw error;

    const urls = (routes || []).map((r) => {
      const lastmod = r.updated_at ? r.updated_at.split("T")[0] : new Date().toISOString().split("T")[0];
      const priority = PRIORITY_MAP[r.entity_type] || "0.5";
      const changefreq = CHANGEFREQ_MAP[r.entity_type] || "monthly";

      return `  <url>
    <loc>${escapeXml(baseUrl + r.current_path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Sitemap error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate sitemap" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
