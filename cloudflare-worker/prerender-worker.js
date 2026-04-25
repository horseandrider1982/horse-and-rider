/**
 * Cloudflare Worker: Prerender für Bots & Social Crawler
 * ----------------------------------------------------------
 * Zweck: Bots erhalten vollständig gerendertes HTML (SEO + Social Sharing),
 * echte User bekommen die normale SPA von Lovable.
 *
 * Architektur:
 *   1. Request kommt rein → Bot-Erkennung via User-Agent
 *   2. Wenn Bot:
 *        a) KV-Cache prüfen (Key = URL-Pfad)
 *        b) Cache-Hit → HTML direkt ausliefern
 *        c) Cache-Miss → Browser Rendering API aufrufen (Headless Chrome)
 *           → HTML in KV speichern (TTL: 7 Tage)
 *           → HTML ausliefern
 *   3. Wenn echter User → Pass-through zur SPA (Lovable Origin)
 *
 * Ausgeschlossene Pfade (immer Pass-through, nie prerendern):
 *   /admin, /account, /checkout, /api, /assets, statische Dateien
 *
 * Setup in Cloudflare Dashboard:
 *   - Workers & Pages → Create Worker → diesen Code einfügen
 *   - Settings → Variables → KV Namespace Bindings:
 *       Variable name: PRERENDER_CACHE
 *       KV namespace: prerender_cache (das, das Sie erstellt haben)
 *   - Settings → Variables → Environment Variables:
 *       ACCOUNT_ID = <Ihre Cloudflare Account ID>
 *       CF_API_TOKEN = <Ihr API Token mit Browser Rendering Edit> (als Secret!)
 *   - Triggers → Routes → hinzufügen:
 *       horse-and-rider.de/*
 *       www.horse-and-rider.de/*
 */

// ───────────────────────────────────────────────────────────────
// 1. KONFIGURATION
// ───────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 Tage
const ORIGIN_HOST = "horse-and-rider.lovable.app"; // Lovable Origin

// Bekannte Bots & Social Crawler (User-Agent Patterns, lowercase)
const BOT_PATTERNS = [
  // Suchmaschinen
  "googlebot",
  "bingbot",
  "slurp",            // Yahoo
  "duckduckbot",
  "baiduspider",
  "yandex",
  "sogou",
  "exabot",
  "facebot",
  "ia_archiver",
  "applebot",
  // Social Media
  "facebookexternalhit",
  "facebookcatalog",
  "twitterbot",
  "linkedinbot",
  "pinterest",
  "whatsapp",
  "telegrambot",
  "skypeuripreview",
  "discordbot",
  "slackbot",
  "redditbot",
  // AI Crawler
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "perplexitybot",
  "claude-web",
  "claudebot",
  "anthropic-ai",
  "ccbot",            // Common Crawl (für AI-Training)
  "google-extended",
  "bytespider",
  // SEO Tools
  "ahrefsbot",
  "semrushbot",
  "mj12bot",
  "dotbot",
];

// Pfade, die NIEMALS prerendert werden (immer SPA durchreichen)
const EXCLUDED_PATH_PREFIXES = [
  "/admin",
  "/account",
  "/checkout",
  "/api",
  "/assets",
  "/static",
  "/_",
];

// Datei-Endungen, die nie prerendert werden (Bilder, JS, CSS, Sitemaps, etc.)
const EXCLUDED_EXTENSIONS = [
  ".js", ".css", ".map", ".json", ".xml", ".txt",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf",
  ".pdf", ".zip", ".mp4", ".webm",
];

// ───────────────────────────────────────────────────────────────
// 2. HELPER
// ───────────────────────────────────────────────────────────────

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

function shouldPrerender(url) {
  const path = url.pathname.toLowerCase();

  // Excluded prefixes
  if (EXCLUDED_PATH_PREFIXES.some((p) => path.startsWith(p))) return false;

  // Excluded file extensions
  if (EXCLUDED_EXTENSIONS.some((ext) => path.endsWith(ext))) return false;

  return true;
}

function cacheKey(url) {
  // Normalisierter Key: Pfad + sortierte Query Params
  const params = [...url.searchParams.entries()].sort();
  const qs = params.map(([k, v]) => `${k}=${v}`).join("&");
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

// ───────────────────────────────────────────────────────────────
// 3. BROWSER RENDERING API CALL
// ───────────────────────────────────────────────────────────────

async function renderWithBrowserAPI(targetUrl, env) {
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/browser-rendering/content`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: targetUrl,
      // Warten bis SPA hydratisiert + Daten geladen sind
      waitForTimeout: 3000,
      // Optional: warten bis bestimmtes Element existiert
      // waitForSelector: "main",
      // Viewport für SEO-Snapshot
      viewport: { width: 1280, height: 800 },
      // Nur HTML, keine Screenshots
      gotoOptions: {
        waitUntil: "networkidle0",
        timeout: 30000,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Browser Rendering API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data.success || !data.result) {
    throw new Error(`Browser Rendering API returned no content: ${JSON.stringify(data)}`);
  }

  return data.result; // HTML String
}

// ───────────────────────────────────────────────────────────────
// 4. MAIN HANDLER
// ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("User-Agent") || "";

    // 1) Echte User → direkt zur SPA durchreichen (kein Overhead)
    if (!isBot(userAgent)) {
      return fetch(request);
    }

    // 2) Bot, aber Pfad nicht prerender-fähig (Asset, /admin, etc.)
    if (!shouldPrerender(url)) {
      return fetch(request);
    }

    // 3) Bot + prerender-fähiger Pfad → Cache prüfen
    const key = cacheKey(url);

    try {
      const cached = await env.PRERENDER_CACHE.get(key);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Prerender-Cache": "HIT",
            "Cache-Control": "public, max-age=300",
          },
        });
      }

      // 4) Cache-Miss → frisch rendern
      const targetUrl = `https://${url.host}${url.pathname}${url.search}`;
      const html = await renderWithBrowserAPI(targetUrl, env);

      // Async im Hintergrund cachen (Bot wartet nicht darauf)
      ctx.waitUntil(
        env.PRERENDER_CACHE.put(key, html, { expirationTtl: CACHE_TTL_SECONDS })
      );

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "X-Prerender-Cache": "MISS",
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (err) {
      // Bei Fehler: Fallback auf SPA, damit Bot wenigstens etwas bekommt
      console.error("Prerender error:", err.message);
      const fallback = await fetch(request);
      const newHeaders = new Headers(fallback.headers);
      newHeaders.set("X-Prerender-Cache", "ERROR");
      newHeaders.set("X-Prerender-Error", err.message.slice(0, 200));
      return new Response(fallback.body, {
        status: fallback.status,
        headers: newHeaders,
      });
    }
  },
};
