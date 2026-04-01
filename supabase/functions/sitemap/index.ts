import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://horse-and-rider.de";

const PRIORITY_MAP: Record<string, string> = {
  homepage: "1.0",
  product: "0.8",
  collection: "0.7",
  brand: "0.6",
  news: "0.6",
  page: "0.5",
  custom: "0.4",
};

const CHANGEFREQ_MAP: Record<string, string> = {
  homepage: "daily",
  product: "weekly",
  collection: "weekly",
  brand: "monthly",
  news: "monthly",
  page: "yearly",
  custom: "monthly",
};

const STATIC_PAGES = [
  { path: "/de", type: "homepage" },
  { path: "/de/unsere-marken", type: "collection" },
  { path: "/de/news", type: "news" },
  { path: "/de/faq", type: "page" },
  { path: "/de/kontakt", type: "page" },
  { path: "/de/search", type: "custom" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const allRoutes: Array<{ current_path: string; entity_type: string; updated_at: string }> = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("public_routes")
        .select("current_path, entity_type, updated_at")
        .eq("is_public", true)
        .order("entity_type")
        .order("current_path")
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;
      allRoutes.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }

    const today = new Date().toISOString().split("T")[0];
    const urlEntries: string[] = STATIC_PAGES.map((sp) => {
      const priority = PRIORITY_MAP[sp.type] || "0.5";
      const changefreq = CHANGEFREQ_MAP[sp.type] || "monthly";
      return urlEntry(BASE_URL + sp.path, today, changefreq, priority);
    });

    const seenPaths = new Set(STATIC_PAGES.map((sp) => sp.path));

    for (const route of allRoutes) {
      const path = route.current_path;
      if (seenPaths.has(path)) continue;
      seenPaths.add(path);

      const lastmod = route.updated_at ? route.updated_at.split("T")[0] : today;
      const priority = PRIORITY_MAP[route.entity_type] || "0.5";
      const changefreq = CHANGEFREQ_MAP[route.entity_type] || "monthly";
      urlEntries.push(urlEntry(BASE_URL + path, lastmod, changefreq, priority));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

    return new Response(req.method === "HEAD" ? null : xml, {
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

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
