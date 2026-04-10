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

  const body = await req.json().catch(() => ({}));
  let handles: string[] = body.handles || [];
  const locale: string = body.locale || "de";

  // If no handles provided, find next batch of 10 missing ones
  if (handles.length === 0) {
    const { data: routes } = await sb
      .from("public_routes")
      .select("current_path")
      .eq("entity_type", "collection")
      .like("current_path", "/de/collections/%");

    const allHandles = [...new Set(
      (routes || [])
        .map((r: any) => r.current_path.replace("/de/collections/", ""))
        .filter((h: string) => !h.includes("sale") && !["frontpage", "befreiter-steuersatz", "ermassigter-steuersatz", "geschenkgutscheine", "gutscheine"].includes(h))
    )].sort();

    const { data: existing } = await sb
      .from("collection_seo_texts")
      .select("handle")
      .eq("locale", locale);

    const existingSet = new Set((existing || []).map((e: any) => e.handle));
    handles = allHandles.filter((h) => !existingSet.has(h)).slice(0, 10);
  }

  if (handles.length === 0) {
    return new Response(JSON.stringify({ message: "All done", inserted: 0, remaining: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const handlesList = handles.map((h) => `- ${h} (${humanName(h)})`).join("\n");

  const prompt = locale === "de"
    ? `Du bist SEO-Texter für Horse & Rider Luhmühlen, einen Premium-Reitsportshop.
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
${handlesList}`
    : `You are an SEO copywriter for Horse & Rider Luhmühlen, a premium equestrian shop based in Germany.
Create a short SEO text for each of the following Shopify collection handles.

RULES:
- Each text should be 80-150 words
- HTML format: Use <p>, <h2>, <h3>, <ul>, <li> tags
- Focus on equestrian keywords and purchase intent
- Mention Horse & Rider Luhmühlen naturally
- Professional but inviting tone
- No made-up facts about specific products

Respond ONLY with a JSON array of objects with these fields:
- "handle": the collection handle (exactly as given)
- "heading": short heading (max 60 characters)
- "body": the HTML SEO text

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
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI API ${aiRes.status}`, detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.trim();
    if (content.startsWith("```")) {
      content = content.split("\n").slice(1).join("\n");
      content = content.replace(/```\s*$/, "");
    }

    const texts = JSON.parse(content);
    let inserted = 0;
    const errors: string[] = [];

    for (const t of texts) {
      const { error } = await sb.from("collection_seo_texts").upsert(
        { handle: t.handle, heading: t.heading, body: t.body, locale },
        { onConflict: "handle,locale" }
      );
      if (error) {
        errors.push(`${t.handle}: ${error.message}`);
      } else {
        inserted++;
      }
    }

    // Count remaining
    const { data: routes2 } = await sb
      .from("public_routes")
      .select("current_path")
      .eq("entity_type", "collection")
      .like("current_path", "/de/collections/%");
    const totalHandles = [...new Set(
      (routes2 || [])
        .map((r: any) => r.current_path.replace("/de/collections/", ""))
        .filter((h: string) => !h.includes("sale") && !["frontpage", "befreiter-steuersatz", "ermassigter-steuersatz", "geschenkgutscheine", "gutscheine"].includes(h))
    )].length;
    const { count } = await sb.from("collection_seo_texts").select("*", { count: "exact", head: true }).eq("locale", "de");

    return new Response(
      JSON.stringify({ inserted, total: totalHandles, done: count, remaining: totalHandles - (count || 0), errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
