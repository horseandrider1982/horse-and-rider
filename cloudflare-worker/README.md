# Cloudflare Prerender Worker

Edge-Worker, der Bots vollständig gerendertes HTML ausliefert und echte User direkt zur SPA durchreicht.

## Architektur

```
Request
   │
   ▼
[Cloudflare Worker]
   │
   ├── Echter User?  ─→ Pass-through zur Lovable SPA
   │
   └── Bot/Crawler?
          │
          ├── KV-Cache HIT  ─→ HTML zurück (schnell, ~10ms)
          │
          └── KV-Cache MISS
                 │
                 ▼
          [Browser Rendering API]
          (Headless Chrome am Edge)
                 │
                 ▼
          HTML in KV speichern (TTL: 7 Tage)
                 │
                 ▼
          HTML zurück
```

## Setup-Schritte in Cloudflare

### 1. Worker erstellen
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Create Worker**
2. Name: `prerender-worker`
3. **Deploy** klicken (mit Standard-Code), danach **Edit Code**
4. Inhalt von `prerender-worker.js` einfügen → **Deploy**

### 2. KV Namespace binden
1. Worker öffnen → **Settings** → **Bindings** → **Add binding**
2. Type: **KV Namespace**
3. Variable name: `PRERENDER_CACHE`
4. KV namespace: `prerender_cache` auswählen
5. **Save**

### 3. Environment Variables
Settings → Variables and Secrets → **Add**:

| Name           | Type     | Wert                          |
|----------------|----------|-------------------------------|
| `ACCOUNT_ID`   | Plaintext| Ihre Cloudflare Account ID    |
| `CF_API_TOKEN` | **Secret** | Ihr API Token (Browser Rendering Edit) |

### 4. Routes (Worker mit Domain verbinden)
Worker → **Settings** → **Triggers** → **Add Route**:
- `horse-and-rider.de/*` (Zone: horse-and-rider.de)
- `www.horse-and-rider.de/*` (Zone: horse-and-rider.de)

⚠️ **Wichtig:** Der Worker fängt dann ALLE Requests auf diesen Domains ab. Echte User werden aber direkt durchgereicht — kein Performance-Impact.

## Testing

### Echter User (sollte SPA bekommen)
```bash
curl -I https://horse-and-rider.de/de/product/hans-melzer-trense-luhmuhlen-schwarz-silber-dunkle-kristalle
# Erwarte: kein X-Prerender-Cache Header
```

### Bot (sollte gerendertes HTML bekommen)
```bash
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
     -I https://horse-and-rider.de/de/product/hans-melzer-trense-luhmuhlen-schwarz-silber-dunkle-kristalle
# Erste Anfrage: X-Prerender-Cache: MISS
# Zweite Anfrage: X-Prerender-Cache: HIT
```

### HTML inspizieren
```bash
curl -A "Googlebot" https://horse-and-rider.de/de/product/... | grep -E "<title>|<meta"
```

## Cache-Verwaltung

### Manuell einen Cache-Eintrag löschen
Cloudflare Dashboard → **Storage & Databases** → **KV** → `prerender_cache` → Eintrag suchen → Delete

### Gesamten Cache leeren
KV Namespace löschen + neu erstellen, oder per API:
```bash
# Liste aller Keys (alle 7 Tage automatisch ungültig)
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces/$KV_ID/keys" \
     -H "Authorization: Bearer $CF_API_TOKEN"
```

## Kosten-Schätzung

| Position             | Annahme                  | Kosten/Monat |
|----------------------|--------------------------|--------------|
| Workers Paid Plan    | Basis                    | $5,00        |
| Browser Renderings   | 2.000 Seiten × 4 Refresh = 8k Renderings | ~$0,04 |
| KV Reads             | ~50k Bot-Hits/Monat      | $0,25        |
| KV Writes            | ~8k                      | $0,04        |
| **Gesamt (geschätzt)** |                        | **~$5,35**   |

## Troubleshooting

**Bot bekommt SPA statt HTML?**
→ Worker-Logs prüfen: Workers & Pages → prerender-worker → **Logs** → Live-Logs starten
→ User-Agent in `BOT_PATTERNS` ergänzen

**`Browser Rendering API 403`?**
→ API Token braucht Permission: `Account → Browser Rendering → Edit`
→ Workers Paid Plan aktiv?

**`X-Prerender-Cache: ERROR`?**
→ `X-Prerender-Error` Header prüfen, meist Timeout der SPA-Hydration
→ `waitForTimeout` im Worker erhöhen
