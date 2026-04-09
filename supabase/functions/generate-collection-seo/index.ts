import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function humanName(handle: string): string {
  return handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get handles from request or generate for all missing
  const body = await req.json().catch(() => ({}));
  let handles: string[] = body.handles || [];

  if (handles.length === 0) {
    // Get all collection handles that don't have SEO texts yet
    const { data: routes } = await sb
      .from("public_routes")
      .select("current_path")
      .eq("entity_type", "collection")
      .like("current_path", "/de/collections/%");

    const allHandles = [...new Set(
      (routes || [])
        .map((r: any) => r.current_path.replace("/de/collections/", ""))
        .filter((h: string) => !h.includes("sale") && !["frontpage", "befreiter-steuersatz", "ermassigter-steuersatz", "geschenkgutscheine", "gutscheine"].includes(h))
    )];

    const { data: existing } = await sb
      .from("collection_seo_texts")
      .select("handle")
      .eq("locale", "de");

    const existingSet = new Set((existing || []).map((e: any) => e.handle));
    handles = allHandles.filter((h) => !existingSet.has(h));
  }

  if (handles.length === 0) {
    return new Response(JSON.stringify({ message: "All collections already have SEO texts", count: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Process in batches of 15
  const BATCH_SIZE = 15;
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < handles.length; i += BATCH_SIZE) {
    const batch = handles.slice(i, i + BATCH_SIZE);
    const handlesList = batch.map((h) => `- ${h} (${humanName(h)})`).join("\n");

    const prompt = `Du bist SEO-Texter für Horse & Rider Luhmühlen, einen Premium-Reitsportshop.
Erstelle für jede der folgenden Shopify-Collection-Handles einen kurzen SEO-Text.

REGELN:
- Jeder Text soll 80-150 Wörter haben
- HTML-Format: Verwende <p>, <h2>, <h3>, <ul>, <li> Tags
- Fokus auf Reitsport-Keywords und Kaufabsicht
- Erwähne Horse & Rider Luhmühlen natürlich
- Professionell aber einladend
- Keine erfundenen Fakten über spezifische Produkte

Antworte NUR mit einem JSON-Array von Objekten mit den Feldern:
- "handle": der Collection-Handle (exakt wie angegeben)
- "heading": kurze Überschrift (max 60 Zeichen)
- "body": der HTML-SEO-Text

Collections:
${handlesList}`;

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 8000,
        }),
      });

      if (!aiRes.ok) {
        errors.push(`Batch ${i / BATCH_SIZE + 1}: AI API ${aiRes.status}`);
        continue;
      }

      const aiData = await aiRes.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      content = content.trim();
      if (content.startsWith("```")) {
        content = content.split("\n").slice(1).join("\n");
        content = content.replace(/```\s*$/, "");
      }

      const texts = JSON.parse(content);

      for (const t of texts) {
        const { error } = await sb.from("collection_seo_texts").upsert(
          {
            handle: t.handle,
            heading: t.heading,
            body: t.body,
            locale: "de",
          },
          { onConflict: "handle,locale" }
        );
        if (error) {
          errors.push(`DB error for ${t.handle}: ${error.message}`);
        } else {
          inserted++;
        }
      }

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${texts.length} texts inserted`);
    } catch (err) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
    }
  }

  return new Response(
    JSON.stringify({
      inserted,
      total: handles.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
