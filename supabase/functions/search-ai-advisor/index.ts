import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPIFY_STORE_DOMAIN = "bpjvam-c1.myshopify.com";
const SHOPIFY_API_VERSION = "2025-07";
const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

const PRODUCTS_SEARCH_QUERY = `
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          title
          description
          handle
          vendor
          productType
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
          }
        }
      }
    }
  }
`;

async function fetchShopifyProducts(query: string, storefrontToken: string): Promise<string> {
  try {
    const res = await fetch(SHOPIFY_STOREFRONT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": storefrontToken,
      },
      body: JSON.stringify({
        query: PRODUCTS_SEARCH_QUERY,
        variables: { query, first: 8 },
      }),
    });

    if (!res.ok) return "";
    const data = await res.json();
    const edges = data.data?.products?.edges || [];

    return edges.map((e: any) => {
      const n = e.node;
      const price = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: n.priceRange.minVariantPrice.currencyCode,
      }).format(parseFloat(n.priceRange.minVariantPrice.amount));

      return `- ${n.title} (${n.vendor || "–"}, ${price}): ${(n.description || "").slice(0, 300)}`;
    }).join("\n");
  } catch {
    return "";
  }
}

async function fetchCmsPages(sb: any, query: string): Promise<string> {
  try {
    const { data } = await sb
      .from("cms_pages")
      .select("title, content, slug")
      .eq("status", "active")
      .textSearch("content", query.split(" ").join(" & "), { type: "plain" })
      .limit(5);

    if (!data || data.length === 0) {
      // Fallback: fetch all active pages
      const { data: allPages } = await sb
        .from("cms_pages")
        .select("title, content, slug")
        .eq("status", "active")
        .limit(10);

      if (!allPages || allPages.length === 0) return "";
      return allPages.map((p: any) => {
        const plainText = p.content.replace(/<[^>]*>/g, "").slice(0, 500);
        return `[CMS-Seite: ${p.title}] ${plainText}`;
      }).join("\n\n");
    }

    return data.map((p: any) => {
      const plainText = p.content.replace(/<[^>]*>/g, "").slice(0, 500);
      return `[CMS-Seite: ${p.title}] ${plainText}`;
    }).join("\n\n");
  } catch {
    return "";
  }
}

async function fetchBrandKnowledge(sb: any, query: string): Promise<string> {
  try {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 3);

    // Step 1: Find brands whose name matches any query word
    const { data: allBrands } = await sb
      .from("brands")
      .select("id, name")
      .eq("is_active", true);

    const brandMap = new Map((allBrands || []).map((b: any) => [b.id, b.name]));

    // Find brand IDs matching the query (e.g. "Sprenger" in query → match brand "Sprenger")
    const matchedBrandIds = (allBrands || [])
      .filter((b: any) => queryWords.some(w => b.name.toLowerCase().includes(w)))
      .map((b: any) => b.id);

    const results: any[] = [];

    // Step 2: Fetch knowledge for matched brands (high priority)
    if (matchedBrandIds.length > 0) {
      const { data: brandData } = await sb
        .from("brand_knowledge")
        .select("page_title, content, source_url, brand_id")
        .in("brand_id", matchedBrandIds)
        .limit(20);

      if (brandData) results.push(...brandData);
    }

    // Step 3: Also do a text search across all brand knowledge for additional context
    // Use ilike for simple matching since full-text search isn't set up on this table
    if (results.length < 15) {
      const searchTerm = queryWords.join("%");
      const { data: textData } = await sb
        .from("brand_knowledge")
        .select("page_title, content, source_url, brand_id")
        .or(`content.ilike.%${searchTerm}%,page_title.ilike.%${searchTerm}%`)
        .limit(10);

      if (textData) {
        const existingUrls = new Set(results.map((r: any) => r.source_url));
        for (const d of textData) {
          if (!existingUrls.has(d.source_url)) results.push(d);
        }
      }
    }

    if (results.length === 0) return "";

    return results.slice(0, 15).map((d: any) => {
      const brand = brandMap.get(d.brand_id) || "Unbekannt";
      return `[${brand} - ${d.page_title || d.source_url}] ${d.content.slice(0, 600)}`;
    }).join("\n\n");
  } catch (e) {
    console.error("Brand knowledge fetch error:", e);
    return "";
  }
}

async function fetchBrandSeoTexts(sb: any): Promise<string> {
  try {
    const { data } = await sb
      .from("brands")
      .select("name, seo_text")
      .eq("is_active", true)
      .not("seo_text", "is", null)
      .limit(50);

    if (!data || data.length === 0) return "";

    return data.map((b: any) => {
      const plainText = (b.seo_text || "").replace(/<[^>]*>/g, "").slice(0, 400);
      return `[Marke: ${b.name}] ${plainText}`;
    }).join("\n\n");
  } catch {
    return "";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Query too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN") || "d69c81decdb58ced137c44fa1b033aa3";

    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch all context in parallel
    const [productContext, cmsContext, brandKnowledge, brandSeo] = await Promise.all([
      fetchShopifyProducts(query.trim(), storefrontToken),
      fetchCmsPages(sb, query.trim()),
      fetchBrandKnowledge(sb, query.trim()),
      fetchBrandSeoTexts(sb),
    ]);

    const contextParts: string[] = [];
    if (productContext) contextParts.push(`=== PRODUKTE IM SHOP ===\n${productContext}`);
    if (cmsContext) contextParts.push(`=== CMS-SEITEN ===\n${cmsContext}`);
    if (brandKnowledge) contextParts.push(`=== MARKENWISSEN (gecrawlte Herstellerseiten) ===\n${brandKnowledge}`);
    if (brandSeo) contextParts.push(`=== MARKEN-BESCHREIBUNGEN ===\n${brandSeo}`);

    const contextBlock = contextParts.length > 0
      ? `\n\nHier sind die verfügbaren Informationen aus dem Shop und den Herstellerseiten:\n\n${contextParts.join("\n\n")}`
      : "\n\nEs sind aktuell keine relevanten Daten verfügbar.";

    const systemPrompt = `Du bist ein kompetenter, freundlicher Berater für den Online-Reitsportshop "Horse & Rider Luhmühlen".

WICHTIGE REGELN:
- Antworte AUSSCHLIESSLICH basierend auf den unten bereitgestellten Informationen.
- ERFINDE KEINE Informationen, Produkte, Preise oder Fakten.
- Wenn du etwas nicht weißt oder keine passenden Daten findest, sage das ehrlich.
- Beziehe dich auf tatsächliche Produkte, Marken und Informationen aus dem Shop.
- Antworte auf Deutsch, kompetent, freundlich und vertrauenswürdig.
- Halte dich kurz: maximal 3-5 Sätze.
- Wenn du Produkte empfiehlst, nenne die tatsächlichen Produktnamen aus den bereitgestellten Daten.

Reitsport-Synonyme:
- Schabracke = Saddle Pad
- Gamaschen = Boots / Beinschutz
- Airbagweste = Sicherheitsweste
- Pferdedecke = Outdoordecke / Regendecke / Winterdecke
- Reithelm = Helm
- Turnierjacket = Turniersakko
${contextBlock}

Format deiner Antwort als JSON:
{
  "answer": "Deine kompakte, hilfreiche Antwort basierend auf den bereitgestellten Daten",
  "recommendedProducts": ["Exakter Produktname 1", "Exakter Produktname 2"],
  "categories": ["Relevante Kategorie 1", "Relevante Kategorie 2"]
}

Antworte AUSSCHLIESSLICH mit dem JSON-Objekt, ohne Markdown-Codeblöcke.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query.trim() },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        answer: content,
        recommendedProducts: [],
        categories: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI advisor error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
