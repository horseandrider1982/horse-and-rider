import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Du bist ein erfahrener SEO-Texter für einen Premium-Reitsportfachhandel (horse-and-rider.de). 
Deine Aufgabe ist es, einen suchmaschinenoptimierten HTML-Text für eine Markenseite zu schreiben.

WICHTIGE REGELN:
- Schreibe auf Deutsch in einem professionellen, aber zugänglichen Ton
- Der Text soll 200–400 Wörter lang sein
- Verwende semantisches HTML: <h3>, <p>, <ul>/<li>, <strong>
- KEIN <h1> oder <h2> (diese werden von der Seite selbst gesetzt)
- Beginne mit einer <h3>-Überschrift über die Marke
- Integriere relevante Keywords natürlich: Markenname, Produktkategorien, Reitsport, Qualität
- Hebe Alleinstellungsmerkmale und Besonderheiten der Marke hervor
- Erwähne, dass die Produkte bei horse-and-rider.de erhältlich sind
- Schreibe so, dass der Text sowohl für Suchmaschinen als auch für Kunden wertvoll ist
- Gib NUR den HTML-Text zurück, keine Erklärungen oder Markdown-Codeblöcke`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, websiteUrl, existingSeoText } = await req.json();

    if (!brandName) {
      return new Response(
        JSON.stringify({ error: "brandName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Step 1: Scrape brand website if URL provided
    let scrapedContent = "";
    if (websiteUrl && FIRECRAWL_API_KEY) {
      try {
        console.log("Scraping brand website:", websiteUrl);

        // Scrape main page
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: websiteUrl,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          const mainContent = scrapeData?.data?.markdown || scrapeData?.markdown || "";
          if (mainContent) {
            scrapedContent += `\n\n=== HAUPTSEITE ===\n${mainContent.slice(0, 3000)}`;
          }
        }

        // Map subpages to find relevant ones
        const mapRes = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: websiteUrl,
            search: "about über produkte products",
            limit: 5,
          }),
        });

        if (mapRes.ok) {
          const mapData = await mapRes.json();
          const subpages = (mapData?.links || []).slice(0, 3);

          // Scrape top subpages
          for (const subUrl of subpages) {
            if (subUrl === websiteUrl) continue;
            try {
              const subRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  url: subUrl,
                  formats: ["markdown"],
                  onlyMainContent: true,
                }),
              });
              if (subRes.ok) {
                const subData = await subRes.json();
                const subContent = subData?.data?.markdown || subData?.markdown || "";
                if (subContent) {
                  scrapedContent += `\n\n=== UNTERSEITE: ${subUrl} ===\n${subContent.slice(0, 1500)}`;
                }
              }
            } catch (e) {
              console.warn("Subpage scrape failed:", subUrl, e);
            }
          }
        }
      } catch (e) {
        console.warn("Firecrawl scraping failed, continuing without:", e);
      }
    }

    // Step 2: Build user prompt
    let userPrompt = `Schreibe einen SEO-Text für die Marke "${brandName}" für den Reitsport-Onlineshop horse-and-rider.de.`;

    if (scrapedContent) {
      userPrompt += `\n\nHier sind Informationen von der offiziellen Website der Marke:\n${scrapedContent.slice(0, 6000)}`;
    }

    if (existingSeoText && !existingSeoText.includes("Über die Marke")) {
      userPrompt += `\n\nEs gibt bereits einen bestehenden SEO-Text, den du als Grundlage und Inspiration nutzen sollst (aber verbessere und erweitere ihn):\n${existingSeoText}`;
    }

    if (!scrapedContent && (!existingSeoText || existingSeoText.includes("Über die Marke"))) {
      userPrompt += `\n\nEs liegen leider keine Website-Inhalte oder bestehende Texte vor. Schreibe einen generischen aber professionellen SEO-Text basierend auf dem Markennamen. Halte dich an allgemeine Informationen über die Marke im Reitsportbereich.`;
    }

    console.log("Generating SEO text for:", brandName);

    // Step 3: Generate with Lovable AI
    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate Limit erreicht, bitte versuche es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Credits aufgebraucht. Bitte Guthaben aufladen." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      throw new Error("AI gateway error: " + aiRes.status);
    }

    const aiData = await aiRes.json();
    let seoText = aiData?.choices?.[0]?.message?.content || "";

    // Clean up potential markdown code blocks
    seoText = seoText.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

    console.log("SEO text generated successfully, length:", seoText.length);

    return new Response(
      JSON.stringify({ seo_text: seoText, scraped: !!scrapedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-brand-seo error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
