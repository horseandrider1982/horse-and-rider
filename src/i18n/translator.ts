/**
 * Auto-translate missing UI keys via edge function.
 * ONLY for UI texts, NEVER for Shopify content.
 */
import { supabase } from "@/integrations/supabase/client";

export async function translateMissing(
  sourceTexts: Record<string, string>,
  targetLocale: string
): Promise<Record<string, string>> {
  if (Object.keys(sourceTexts).length === 0) return {};

  try {
    const { data, error } = await supabase.functions.invoke("auto-translate", {
      body: { texts: sourceTexts, targetLocale },
    });

    if (error) throw error;
    return data?.translations || sourceTexts;
  } catch (err) {
    console.error("Auto-translate error:", err);
    // Fallback: return source texts (German)
    return sourceTexts;
  }
}
