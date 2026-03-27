

# Shopify Kategoriemenü im Header anzeigen

## Voraussetzung: Storefront Token aktualisieren

Der aktuelle Storefront Access Token hat nicht den benötigten Scope `unauthenticated_read_content`. Du musst diesen in deinem Shopify Admin aktualisieren:

1. Gehe zu **Shopify Admin** > **Settings** > **Apps and sales channels** > **Develop apps** (oder **Headless**)
2. Öffne die App, die den Storefront Token bereitstellt
3. Unter **Storefront API access scopes** aktiviere **`unauthenticated_read_content`**
4. Speichere und kopiere ggf. den neuen Token

Falls sich der Token ändert, muss er in `src/lib/shopify.ts` aktualisiert werden.

## Umsetzung

Aktuell holt der `ShopifyMenuPlaceholder` in `CmsMenuItemRenderer.tsx` fest das Menü `main-menu`. In der CMS-Menüstruktur ist dieser Platzhalter bereits an der richtigen Stelle eingebaut (zwischen "Startseite" und "Unsere Marken", sort_order 1).

### Änderung 1: Menü-Handle konfigurierbar machen

**Datei: `src/hooks/usePublicCmsMenus.ts`** bzw. CMS-Menü-Item-Datenmodell
- Das `shopify_menu_placeholder`-Item soll ein optionales Feld `url` nutzen, um den Shopify-Menü-Handle zu transportieren (z.B. `kategoriemenu`).

**Datei: `src/components/CmsMenuItemRenderer.tsx`**
- `ShopifyMenuPlaceholder` erhält den Handle aus dem `url`-Feld des CMS-Menu-Items statt fest `main-menu`.
- Fallback bleibt `main-menu` falls kein Handle gesetzt.

### Änderung 2: CMS-Menü-Item URL setzen

- Im bestehenden Shopify-Menü-Platzhalter in der Top Navigation das `url`-Feld auf `kategoriemenu` setzen (via Admin > Menüverwaltung oder per Datenbank-Update).

### Änderung 3: Dropdown-Darstellung für Kategorien mit Unterkategorien

- Die bestehende `ShopifyNavLink`-Komponente unterstützt bereits verschachtelte Menüpunkte mit Hover-Dropdown — das funktioniert out-of-the-box.

## Ergebnis

Nach Token-Update und Änderung:
- Header zeigt: **Startseite** | **[Shopify Kategorien mit Dropdowns]** | **Unsere Marken** | ...
- Die Kategorien kommen direkt aus dem Shopify-Menü `kategoriemenu`

## Technische Details

- Geänderte Dateien: `src/components/CmsMenuItemRenderer.tsx` (1 Zeile: Handle aus Item lesen statt hardcoded)
- Optional: Admin-Menüeditor erweitern, damit man den Shopify-Handle im UI eingeben kann
- Keine DB-Migration nötig (das `url`-Feld existiert bereits auf `cms_menu_items`)

