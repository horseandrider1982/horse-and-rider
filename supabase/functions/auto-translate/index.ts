import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_NAMES: Record<string, string> = {
  de: "German",
  en: "English",
  es: "Spanish",
  fr: "French",
  nl: "Dutch",
  pl: "Polish",
  da: "Danish",
  sv: "Swedish",
  it: "Italian",
  pt: "Portuguese",
  cs: "Czech",
  hu: "Hungarian",
  fi: "Finnish",
  no: "Norwegian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ru: "Russian",
  tr: "Turkish",
  ar: "Arabic",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { texts, targetLocale } = await req.json();

    if (!texts || !targetLocale || typeof texts !== "object") {
      return new Response(
        JSON.stringify({ error: "texts (object) and targetLocale (string) required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      // No AI key — return source texts as fallback
      return new Response(JSON.stringify({ translations: texts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetLangName = LANGUAGE_NAMES[targetLocale] || targetLocale;
    const entries = Object.entries(texts);

    const allTranslations: Record<string, string> = {};
    const CHUNK_SIZE = 50;

    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const chunk = entries.slice(i, i + CHUNK_SIZE);
      const textsObj = Object.fromEntries(chunk);

      try {
        const response = await fetch(
          "https://ai-gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are a professional translation engine for an equestrian e-commerce store (Horse & Rider). Translate the given UI texts from German to ${targetLangName}. Return ONLY a valid JSON object mapping the same keys to translated values. Rules: 1) Do NOT translate brand names, proper nouns, phone numbers, or addresses. 2) Keep {placeholders} like {count}, {year}, {query} unchanged. 3) Be natural, professional, and context-appropriate for e-commerce. 4) Do NOT add explanations or markdown.`,
                },
                {
                  role: "user",
                  content: JSON.stringify(textsObj),
                },
              ],
              temperature: 0.1,
            }),
          }
        );

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || "";

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          Object.assign(allTranslations, parsed);
        } else {
          // Fallback: keep source texts
          chunk.forEach(([key, val]) => {
            allTranslations[key] = val as string;
          });
        }
      } catch (chunkErr) {
        console.error("Chunk translation error:", chunkErr);
        chunk.forEach(([key, val]) => {
          allTranslations[key] = val as string;
        });
      }
    }

    // Persist to database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const upsertData = Object.entries(allTranslations).map(
          ([key, value]) => ({
            locale: targetLocale,
            key,
            value,
            auto_generated: true,
          })
        );

        // Upsert in batches of 100
        for (let i = 0; i < upsertData.length; i += 100) {
          const batch = upsertData.slice(i, i + 100);
          await supabase
            .from("ui_translations")
            .upsert(batch, { onConflict: "locale,key" });
        }
      } catch (dbErr) {
        console.warn("Failed to persist translations:", dbErr);
      }
    }

    return new Response(JSON.stringify({ translations: allTranslations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auto-translate error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
