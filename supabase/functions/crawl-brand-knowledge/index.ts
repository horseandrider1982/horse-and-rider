import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "Firecrawl nicht konfiguriert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch brand
    let brandQuery = sb.from("brands").select("id, name, website_url");
    if (brandId) {
      brandQuery = brandQuery.eq("id", brandId);
    } else {
      brandQuery = brandQuery.not("website_url", "is", null).eq("is_active", true);
    }
    const { data: brands, error: brandErr } = await brandQuery;
    if (brandErr) throw brandErr;

    const brandsToProcess = (brands || []).filter(
      (b: any) => b.website_url && b.website_url.trim().length > 0
    );

    if (brandsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "Keine Marken mit Website-URL gefunden", crawled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCrawled = 0;
    const errors: string[] = [];

    for (const brand of brandsToProcess) {
      try {
        let url = brand.website_url.trim();
        if (!url.startsWith("http")) url = `https://${url}`;

        console.log(`Crawling ${brand.name}: ${url}`);

        // Step 1: Map the site to discover URLs
        const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            limit: 20,
            includeSubdomains: false,
          }),
        });

        if (!mapRes.ok) {
          const err = await mapRes.text();
          console.error(`Map failed for ${brand.name}:`, err);
          errors.push(`${brand.name}: Map failed (${mapRes.status})`);
          continue;
        }

        const mapData = await mapRes.json();
        const urls = (mapData.links || []).slice(0, 15) as string[];

        if (urls.length === 0) {
          // Fallback: scrape just the main URL
          urls.push(url);
        }

        // Step 2: Scrape each URL
        for (const pageUrl of urls) {
          try {
            const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${firecrawlKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: pageUrl,
                formats: ["markdown"],
                onlyMainContent: true,
              }),
            });

            if (!scrapeRes.ok) {
              console.warn(`Scrape failed for ${pageUrl}: ${scrapeRes.status}`);
              continue;
            }

            const scrapeData = await scrapeRes.json();
            const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
            const title = scrapeData.data?.metadata?.title || scrapeData.metadata?.title || pageUrl;

            if (markdown.length < 50) continue; // Skip empty pages

            // Truncate to max 8000 chars per page to keep storage manageable
            const truncated = markdown.slice(0, 8000);

            // Upsert into brand_knowledge
            await sb.from("brand_knowledge").upsert(
              {
                brand_id: brand.id,
                source_url: pageUrl,
                page_title: title.slice(0, 500),
                content: truncated,
                crawled_at: new Date().toISOString(),
              },
              { onConflict: "brand_id,source_url" }
            );

            totalCrawled++;
          } catch (e) {
            console.warn(`Error scraping ${pageUrl}:`, e);
          }
        }
      } catch (e: any) {
        console.error(`Error processing brand ${brand.name}:`, e);
        errors.push(`${brand.name}: ${e.message || "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Crawling abgeschlossen`,
        brands: brandsToProcess.length,
        crawled: totalCrawled,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Crawl error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
