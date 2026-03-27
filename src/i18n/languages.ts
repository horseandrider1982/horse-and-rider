/**
 * Fetch available languages dynamically from Shopify.
 * No static language lists — Shopify is the single source of truth.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AvailableLocale {
  code: string;
  name: string;
  endonymName: string;
  primary: boolean;
}

let cachedLocales: AvailableLocale[] | null = null;

export async function fetchAvailableLanguages(): Promise<AvailableLocale[]> {
  if (cachedLocales) return cachedLocales;

  try {
    const { data, error } = await supabase.functions.invoke(
      "get-shopify-languages"
    );
    if (error) throw error;

    const locales: AvailableLocale[] = (data?.locales || []).map(
      (l: { locale: string; name: string; primary: boolean }) => ({
        code: l.locale.toLowerCase(),
        name: l.name,
        endonymName: l.name, // Shopify Admin API returns only name
        primary: l.primary || false,
      })
    );

    if (locales.length === 0) {
      // Fallback: at least German
      locales.push({
        code: "de",
        name: "German",
        endonymName: "Deutsch",
        primary: true,
      });
    }

    cachedLocales = locales;
    return locales;
  } catch (err) {
    console.error("Failed to fetch languages from Shopify:", err);
    return [
      { code: "de", name: "German", endonymName: "Deutsch", primary: true },
    ];
  }
}

/** Reset cache (e.g., for admin use) */
export function resetLanguageCache(): void {
  cachedLocales = null;
}
