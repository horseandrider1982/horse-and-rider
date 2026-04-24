// Generate an icon for a product property using Lovable AI image generation,
// then upload it to the property-icons storage bucket and update the config row.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Equestrian-themed icon prompt. The brand primary colour is #1c471e (dark green).
function buildPrompt(key: string, label: string): string {
  return [
    `Create a clean, minimalist line-art product feature icon for an equestrian e-commerce shop.`,
    `Subject: visualise the property "${label}" (technical key: "${key}").`,
    `Visual style: simple flat 2D vector icon, single weight outlines, no gradients, no shadows.`,
    `Use only one colour: dark forest green #1c471e on a fully transparent background.`,
    `Square 1:1 composition, centred, generous padding (icon fills around 70% of canvas).`,
    `Clear at small sizes (24-48px), no text, no labels, no watermarks.`,
    `Equestrian / horse riding context but only when meaningful – otherwise a universally readable symbol.`,
    `Make it look part of a coherent professional icon set.`,
  ].join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    // Verify admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: serviceKey },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await userResp.json();
    const roleResp = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    const roles = await roleResp.json();
    if (!Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const configId: string | undefined = body?.configId;
    const key: string | undefined = body?.key;
    const label: string | undefined = body?.label;
    const customPrompt: string | undefined = body?.prompt;
    if (!configId || !key || !label) {
      return new Response(
        JSON.stringify({ error: "configId, key and label required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const prompt = customPrompt && customPrompt.trim().length > 0
      ? customPrompt
      : buildPrompt(key, label);

    // Call Lovable AI Gateway
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      },
    );

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({
          error: "Rate limit erreicht. Bitte einen Moment warten.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({
          error:
            "Lovable AI Guthaben aufgebraucht. Bitte unter Settings → Workspace → Usage aufladen.",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      throw new Error(`AI gateway error ${aiResp.status}: ${t.slice(0, 200)}`);
    }

    const aiJson = await aiResp.json();
    const imageDataUrl: string | undefined =
      aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageDataUrl || !imageDataUrl.startsWith("data:")) {
      throw new Error("AI response did not contain an image");
    }

    // data:image/png;base64,xxx
    const match = imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) throw new Error("Unexpected image data URL format");
    const mime = match[1];
    const base64 = match[2];
    const ext = mime.split("/")[1] || "png";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const path = `${key}-${Date.now()}.${ext}`;

    // Upload via storage REST
    const upResp = await fetch(
      `${supabaseUrl}/storage/v1/object/property-icons/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": mime,
          "x-upsert": "true",
        },
        body: bytes,
      },
    );
    if (!upResp.ok) {
      const t = await upResp.text();
      throw new Error(`Upload failed: ${t.slice(0, 200)}`);
    }

    const publicUrl =
      `${supabaseUrl}/storage/v1/object/public/property-icons/${path}`;

    // Update config row
    const updResp = await fetch(
      `${supabaseUrl}/rest/v1/product_property_display_config?id=eq.${configId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          icon_url: publicUrl,
          icon_prompt: prompt,
          icon_generated_at: new Date().toISOString(),
        }),
      },
    );
    if (!updResp.ok) {
      const t = await updResp.text();
      throw new Error(`Update failed: ${t.slice(0, 200)}`);
    }

    return new Response(
      JSON.stringify({ success: true, icon_url: publicUrl, prompt }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("generate-property-icon error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
