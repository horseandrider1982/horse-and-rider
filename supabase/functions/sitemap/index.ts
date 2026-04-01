import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://horse-and-rider.de";
const SITEMAP_BASE = "https://horse-and-rider.de";
const MAX_URLS_PER_SITEMAP = 10000;

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

// Entity types that get their own sub-sitemaps
const ENTITY_TYPES = ["product", "collection", "brand", "news", "page", "custom"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // null = index, or entity type
  const pageParam = url.searchParams.get("p");  // page number for paginated types

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let xml: string;

    if (!type || type === "index") {
      xml = await buildSitemapIndex(supabase);
    } else if (type === "static") {
      xml = buildStaticSitemap();
    } else {
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      xml = await buildEntitySitemap(supabase, type, page);
    }

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* ── Sitemap Index ─────────────────────────────── */

async function buildSitemapIndex(supabase: ReturnType<typeof createClient>): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap`;

  const entries: string[] = [];

  // Static pages sitemap
  entries.push(sitemapEntry(`${SITEMAP_BASE}/sitemap-static.xml`, today));

  // Per entity type: count to determine pages
  for (const et of ENTITY_TYPES) {
    const { count, error } = await supabase
      .from("public_routes")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("entity_type", et);

    if (error) throw error;
    const total = count || 0;
    if (total === 0) continue;

    const pages = Math.ceil(total / MAX_URLS_PER_SITEMAP);
    for (let p = 1; p <= pages; p++) {
      const suffix = pages > 1 ? `-${p}` : "";
      entries.push(sitemapEntry(`${SITEMAP_BASE}/sitemap-${et}${suffix}.xml`, today));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</sitemapindex>`;
}

/* ── Static Pages Sitemap ──────────────────────── */

function buildStaticSitemap(): string {
  const today = new Date().toISOString().split("T")[0];
  const urlEntries = STATIC_PAGES.map((sp) => {
    const priority = PRIORITY_MAP[sp.type] || "0.5";
    const changefreq = CHANGEFREQ_MAP[sp.type] || "monthly";
    return urlEntry(BASE_URL + sp.path, today, changefreq, priority);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}

/* ── Entity-Type Sitemap (paginated) ───────────── */

async function buildEntitySitemap(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  page: number,
): Promise<string> {
  const from = (page - 1) * MAX_URLS_PER_SITEMAP;
  const allRoutes: Array<{ current_path: string; entity_type: string; updated_at: string }> = [];
  let offset = from;
  const batchSize = 1000;
  const limit = from + MAX_URLS_PER_SITEMAP;

  while (offset < limit) {
    const fetchSize = Math.min(batchSize, limit - offset);
    const { data, error } = await supabase
      .from("public_routes")
      .select("current_path, entity_type, updated_at")
      .eq("is_public", true)
      .eq("entity_type", entityType)
      .order("current_path")
      .range(offset, offset + fetchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allRoutes.push(...data);
    if (data.length < fetchSize) break;
    offset += fetchSize;
  }

  const today = new Date().toISOString().split("T")[0];
  const urlEntries = allRoutes.map((route) => {
    const lastmod = route.updated_at ? route.updated_at.split("T")[0] : today;
    const priority = PRIORITY_MAP[route.entity_type] || "0.5";
    const changefreq = CHANGEFREQ_MAP[route.entity_type] || "monthly";
    return urlEntry(BASE_URL + route.current_path, lastmod, changefreq, priority);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}

/* ── Helpers ───────────────────────────────────── */

function sitemapEntry(loc: string, lastmod: string): string {
  return `  <sitemap>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`;
}

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
