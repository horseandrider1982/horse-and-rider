/**
 * Persistent, language-isolated translation cache using localStorage.
 * cache[language][key] = translation
 */

const CACHE_PREFIX = "i18n_v1_";

export function getTranslations(locale: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${locale}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveTranslations(locale: string, translations: Record<string, string>): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${locale}`, JSON.stringify(translations));
  } catch (e) {
    console.warn("Failed to save i18n cache:", e);
  }
}

export function clearTranslationCache(locale?: string): void {
  if (locale) {
    localStorage.removeItem(`${CACHE_PREFIX}${locale}`);
  } else {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  }
}
