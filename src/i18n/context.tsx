import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useLocation, Outlet, useParams } from "react-router-dom";
import { defaultTranslations } from "./keys";
import { getTranslations, saveTranslations } from "./cache";
import { loadTranslationsFromDB } from "./loader";
import { translateMissing } from "./translator";
import {
  fetchAvailableLanguages,
  type AvailableLocale,
} from "./languages";

export const DEFAULT_LOCALE = "de";

interface I18nContextValue {
  locale: string;
  defaultLocale: string;
  availableLocales: AvailableLocale[];
  t: (key: string, params?: Record<string, string | number>) => string;
  localePath: (path: string) => string;
  switchLocale: (locale: string) => void;
  isLoadingLocales: boolean;
  shopifyLanguage: string; // uppercase for @inContext
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  defaultLocale: DEFAULT_LOCALE,
  availableLocales: [],
  t: (key) => defaultTranslations[key] || key,
  localePath: (path) => `/${DEFAULT_LOCALE}${path === "/" ? "" : path}`,
  switchLocale: () => {},
  isLoadingLocales: true,
  shopifyLanguage: "DE",
});

export const useI18n = () => useContext(I18nContext);

interface I18nProviderProps {
  locale: string;
  children: React.ReactNode;
}

export function I18nProvider({ locale, children }: I18nProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [availableLocales, setAvailableLocales] = useState<AvailableLocale[]>(
    []
  );
  const [translations, setTranslations] = useState<Record<string, string>>(
    {}
  );
  const [isLoadingLocales, setIsLoadingLocales] = useState(true);

  // Load available languages from Shopify (once)
  useEffect(() => {
    fetchAvailableLanguages().then((locales) => {
      setAvailableLocales(locales);
      setIsLoadingLocales(false);
    });
  }, []);

  // Set html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Load translations when locale changes
  useEffect(() => {
    if (locale === DEFAULT_LOCALE) {
      setTranslations(defaultTranslations);
      return;
    }

    let cancelled = false;

    async function load() {
      // 1. Try localStorage cache first (instant)
      const cached = getTranslations(locale);
      if (cached && Object.keys(cached).length > 0) {
        if (!cancelled) setTranslations(cached);
      }

      // 2. Load from DB
      const dbTranslations = await loadTranslationsFromDB(locale);
      const merged = { ...(cached || {}), ...dbTranslations };

      if (!cancelled && Object.keys(dbTranslations).length > 0) {
        setTranslations(merged);
        saveTranslations(locale, merged);
      }

      // 3. Find missing keys and auto-translate
      const allKeys = Object.keys(defaultTranslations);
      const missingKeys = allKeys.filter((k) => !merged[k]);

      if (missingKeys.length > 0) {
        const sourceTexts: Record<string, string> = {};
        missingKeys.forEach((k) => {
          sourceTexts[k] = defaultTranslations[k];
        });

        const autoTranslated = await translateMissing(sourceTexts, locale);
        if (!cancelled) {
          setTranslations((prev) => {
            const final = { ...prev, ...autoTranslated };
            saveTranslations(locale, final);
            return final;
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text: string;
      if (locale === DEFAULT_LOCALE) {
        text = defaultTranslations[key] || key;
      } else {
        text = translations[key] || defaultTranslations[key] || key;
      }

      // Interpolate {param} placeholders
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }

      return text;
    },
    [locale, translations]
  );

  const localePath = useCallback(
    (path: string): string => {
      // Admin routes stay as-is
      if (path.startsWith("/admin")) return path;
      const cleanPath = path === "/" ? "" : path;
      return `/${locale}${cleanPath}`;
    },
    [locale]
  );

  const switchLocale = useCallback(
    (newLocale: string) => {
      const currentPath = location.pathname;
      // Remove current locale prefix
      const pathWithoutLocale =
        currentPath.replace(new RegExp(`^/${locale}`), "") || "/";
      const newPath =
        pathWithoutLocale === "/"
          ? `/${newLocale}`
          : `/${newLocale}${pathWithoutLocale}`;
      navigate(newPath);
    },
    [locale, location.pathname, navigate]
  );

  const shopifyLanguage = locale.toUpperCase();

  const value = useMemo(
    () => ({
      locale,
      defaultLocale: DEFAULT_LOCALE,
      availableLocales,
      t,
      localePath,
      switchLocale,
      isLoadingLocales,
      shopifyLanguage,
    }),
    [
      locale,
      availableLocales,
      t,
      localePath,
      switchLocale,
      isLoadingLocales,
      shopifyLanguage,
    ]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Layout component for locale routes.
 * Validates locale and provides I18n context.
 */
export function I18nLayout() {
  const { locale } = useParams<{ locale: string }>();
  const location = useLocation();

  // Validate locale: must be exactly 2 lowercase letters
  if (!locale || !/^[a-z]{2}$/.test(locale)) {
    // Redirect old paths like /auth → /de/auth
    const redirectPath = `/${DEFAULT_LOCALE}${location.pathname}`;
    // Use window.location for clean redirect (avoid React Router issues)
    window.location.replace(redirectPath);
    return null;
  }

  return (
    <I18nProvider locale={locale}>
      <Outlet />
    </I18nProvider>
  );
}
