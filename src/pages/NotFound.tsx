import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl } from "@/lib/urlNormalize";
import { Loader2 } from "lucide-react";

/** Strip locale prefix (e.g. /de/foo → /foo) for redirect lookups */
function stripLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkRedirect = async () => {
      try {
        const rawPath = stripLocalePrefix(location.pathname);
        const path = normalizeUrl(rawPath);

        let currentPath = path;
        let hops = 0;
        const visited = new Set([path]);

        while (hops < 5) {
          const { data } = await supabase
            .from("redirects")
            .select("id, new_path, new_url")
            .eq("old_path", currentPath)
            .eq("is_active", true)
            .order("priority", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!data) break;

          const target = data.new_path || normalizeUrl(data.new_url);
          if (!target || visited.has(target)) break;

          visited.add(target);
          currentPath = target;
          hops++;
        }

        if (!cancelled && currentPath !== path) {
          const localeMatch = location.pathname.match(/^\/([a-z]{2})(?=\/|$)/);
          const prefix = localeMatch ? `/${localeMatch[1]}` : '';
          navigate(`${prefix}${currentPath}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error("Redirect check failed:", e);
      }

      if (!cancelled) {
        setChecking(false);
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
      }
    };

    checkRedirect();
    return () => { cancelled = true; };
  }, [location.pathname, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{t("notfound.title")}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notfound.message")}</p>
        <LocaleLink to="/" className="text-primary underline hover:text-primary/90">
          {t("notfound.back")}
        </LocaleLink>
      </div>
    </div>
  );
};

export default NotFound;
