// Monitor 404 spikes and send email alert via Resend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_EMAIL = "c.bolten@horse-and-rider.de";
const FROM_EMAIL = "fehler@reitsportartikel24.de";
const SPIKE_FACTOR = 3; // alert if last hour > 3x avg of last 24h
const MIN_HITS = 10;     // ignore tiny absolute counts
const ALERT_COOLDOWN_MIN = 60; // don't spam

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const isTest = url.searchParams.get("test") === "1";

    if (isTest) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Horse & Rider 404-Monitor <${FROM_EMAIL}>`,
          to: [ALERT_EMAIL],
          subject: "✅ Test-Mail: 404-Monitor funktioniert",
          html: `<h2 style="color:#1c471e;font-family:Georgia,serif">✅ Test erfolgreich</h2>
                 <p>Diese Test-Mail bestätigt, dass der 404-Spike-Monitor E-Mails über Resend versenden kann.</p>
                 <p style="color:#666;font-size:12px">Absender: ${FROM_EMAIL}<br>Empfänger: ${ALERT_EMAIL}<br>Zeit: ${new Date().toISOString()}</p>`,
        }),
      });
      const result = await resp.json();
      return new Response(JSON.stringify({ test: true, ok: resp.ok, status: resp.status, result }), {
        status: resp.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Hits last hour
    const { count: lastHour } = await supabase
      .from("not_found_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", hourAgo.toISOString());

    // Hits last 24h
    const { count: last24h } = await supabase
      .from("not_found_log")
      .select("*", { count: "exact", head: true })
      .gte("created_at", dayAgo.toISOString());

    const hourly = (lastHour || 0);
    const baseline = ((last24h || 0) - hourly) / 23; // avg of previous 23h

    const isSpike = hourly >= MIN_HITS && baseline > 0 && hourly > baseline * SPIKE_FACTOR;

    // Cooldown check
    const { data: state } = await supabase
      .from("monitor_404_state")
      .select("last_alert_at")
      .eq("id", 1)
      .maybeSingle();

    const lastAlertAt = state?.last_alert_at ? new Date(state.last_alert_at) : null;
    const cooldownActive = lastAlertAt && (now.getTime() - lastAlertAt.getTime()) < ALERT_COOLDOWN_MIN * 60 * 1000;

    if (!isSpike || cooldownActive) {
      return new Response(JSON.stringify({
        spike: isSpike, cooldownActive, hourly, baseline: baseline.toFixed(2),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get top offending paths
    const { data: topPaths } = await supabase
      .from("not_found_log")
      .select("path")
      .gte("created_at", hourAgo.toISOString())
      .limit(500);

    const counts: Record<string, number> = {};
    (topPaths || []).forEach((r: any) => { counts[r.path] = (counts[r.path] || 0) + 1; });
    const top = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topRows = top.map(([p, c]) => `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${c}×</td><td style="padding:4px 8px;border-bottom:1px solid #eee"><code>${p}</code></td></tr>`).join("");

    const html = `
      <h2 style="color:#1c471e;font-family:Georgia,serif">⚠️ 404-Spike erkannt</h2>
      <p><strong>${hourly}</strong> 404-Fehler in der letzten Stunde (Baseline: ${baseline.toFixed(1)}/h, Faktor: ${(hourly/baseline).toFixed(1)}×)</p>
      <h3>Top 10 betroffene URLs:</h3>
      <table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${topRows}</table>
      <p style="margin-top:20px;color:#666;font-size:12px">Horse & Rider 404-Monitor · ${now.toISOString()}</p>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Horse & Rider 404-Monitor <${FROM_EMAIL}>`,
        to: [ALERT_EMAIL],
        subject: `⚠️ 404-Spike: ${hourly} Fehler/Stunde (${(hourly/baseline).toFixed(1)}× Baseline)`,
        html,
      }),
    });

    const result = await resp.json();
    if (!resp.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);

    await supabase.from("monitor_404_state").update({ last_alert_at: now.toISOString() }).eq("id", 1);

    return new Response(JSON.stringify({ alerted: true, hourly, baseline, top }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("monitor-404-spikes error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
