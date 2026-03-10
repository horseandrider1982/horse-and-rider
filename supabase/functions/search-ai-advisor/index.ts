import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein kompetenter, freundlicher Berater für einen Online-Reitsportshop für Pferd und Reiter.

Deine Aufgabe:
- Beantworte Fragen rund um Reitsportausrüstung kurz, kompetent und hilfreich.
- Gib konkrete Empfehlungen und Auswahlkriterien.
- Antworte auf Deutsch, verständlich und verkaufsstark.
- Halte dich kurz: maximal 3-4 Sätze pro Antwort.
- Wenn du Produkte empfiehlst, nenne Produktkategorien und Suchbegriffe.

Reitsport-Synonyme die du kennen solltest:
- Schabracke = Saddle Pad
- Gamaschen = Boots / Beinschutz
- Airbagweste = Sicherheitsweste
- Pferdedecke = Outdoordecke / Regendecke / Winterdecke
- Reithelm = Helm
- Turnierjacket = Turniersakko

Format deiner Antwort als JSON:
{
  "answer": "Deine kompakte, hilfreiche Antwort",
  "recommendedProducts": ["Suchbegriff 1", "Suchbegriff 2"],
  "categories": ["Kategorie 1", "Kategorie 2"]
}

Antworte AUSSCHLIESSLICH mit dem JSON-Objekt, ohne Markdown-Codeblöcke.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

    // Parse JSON from AI response
    let parsed;
    try {
      // Remove potential markdown code fences
      const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: treat as plain text answer
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
