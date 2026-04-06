import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Create a service-role client for the Sattelservice Supabase project */
function getSattelserviceClient() {
  const url = Deno.env.get("SATTELSERVICE_SUPABASE_URL");
  const key = Deno.env.get("SATTELSERVICE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Sattelservice credentials not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Find a customer in the Sattelservice DB by email */
async function findCustomerByEmail(
  sb: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const { data } = await sb
    .from("customers")
    .select("id")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

/** Map Sattelservice horse row → unified shape */
function mapRow(h: any) {
  return {
    id: h.id,
    name: h.name,
    breed: h.breed,
    color: h.color,
    height_cm: h.height_cm,
    birth_year: h.birth_year,
    discipline: h.discipline,
    training_level: h.training_level,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, horse } = await req.json();
    if (!email) return json({ error: "email required" }, 400);

    const sb = getSattelserviceClient();
    const customerId = await findCustomerByEmail(sb, email);

    // ── LIST ────────────────────────────────────────────────────────────
    if (action === "list") {
      if (!customerId) return json({ data: [] });
      const { data, error } = await sb
        .from("horses")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ data: (data || []).map(mapRow) });
    }

    // ── CREATE ──────────────────────────────────────────────────────────
    if (action === "create") {
      if (!horse?.name) return json({ error: "horse.name required" }, 400);
      if (!customerId) return json({ error: "Customer not found in Sattelservice" }, 404);
      const { data, error } = await sb
        .from("horses")
        .insert({
          customer_id: customerId,
          name: horse.name,
          breed: horse.breed || null,
          color: horse.color || null,
          height_cm: horse.height_cm || null,
          birth_year: horse.birth_year || null,
          discipline: horse.discipline || null,
          training_level: horse.training_level || null,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ data: mapRow(data) });
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if (action === "update") {
      if (!horse?.id) return json({ error: "horse.id required" }, 400);
      if (!customerId) return json({ error: "Customer not found" }, 404);
      const { data, error } = await sb
        .from("horses")
        .update({
          name: horse.name,
          breed: horse.breed || null,
          color: horse.color || null,
          height_cm: horse.height_cm || null,
          birth_year: horse.birth_year || null,
          discipline: horse.discipline || null,
          training_level: horse.training_level || null,
        })
        .eq("id", horse.id)
        .eq("customer_id", customerId)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ data: mapRow(data) });
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!horse?.id) return json({ error: "horse.id required" }, 400);
      if (!customerId) return json({ error: "Customer not found" }, 404);
      const { error } = await sb
        .from("horses")
        .delete()
        .eq("id", horse.id)
        .eq("customer_id", customerId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("sync-horses error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
