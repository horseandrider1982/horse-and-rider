/**
 * Load translations from the persistent database.
 */
import { supabase } from "@/integrations/supabase/client";

export async function loadTranslationsFromDB(
  locale: string
): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from("ui_translations")
      .select("key, value")
      .eq("locale", locale);

    if (error) throw error;

    const translations: Record<string, string> = {};
    data?.forEach((row) => {
      translations[row.key] = row.value;
    });
    return translations;
  } catch (err) {
    console.warn("Failed to load translations from DB:", err);
    return {};
  }
}
