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

const FALLBACK_LOCALES: AvailableLocale[] = [
  { code: "de", name: "German", endonymName: "Deutsch", primary: true },
  { code: "en", name: "English", endonymName: "English", primary: false },
  { code: "es", name: "Spanish", endonymName: "Español", primary: false },
  { code: "nl", name: "Dutch", endonymName: "Nederlands", primary: false },
  { code: "pl", name: "Polish", endonymName: "Polski", primary: false },
  { code: "da", name: "Danish", endonymName: "Dansk", primary: false },
  { code: "sv", name: "Swedish", endonymName: "Svenska", primary: false },
];

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
        endonymName: l.name,
        primary: l.primary || false,
      })
    );

    // Use Shopify locales if multiple, otherwise fallback
    if (locales.length > 1) {
      cachedLocales = locales;
      return locales;
    }
  } catch (err) {
    console.error("Failed to fetch languages from Shopify:", err);
  }

  // Fallback to known configured languages
  cachedLocales = FALLBACK_LOCALES;
  return FALLBACK_LOCALES;
}

/** Reset cache (e.g., for admin use) */
export function resetLanguageCache(): void {
  cachedLocales = null;
}
