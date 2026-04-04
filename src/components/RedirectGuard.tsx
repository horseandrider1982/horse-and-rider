import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl } from "@/lib/urlNormalize";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const cache = new Map<string, string | null>();
const MAX_CACHE = 500;

function cacheSet(key: string, value: string | null) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, value);
}

/** Strip locale prefix (e.g. /de/foo → /foo) for redirect lookups */
function stripLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
}

export function RedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const checking = useRef(false);

  useEffect(() => {
    const channel = supabase
      .channel("redirect-cache-invalidation")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "redirects" },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          cache.clear();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    // Strip locale prefix for redirect DB lookup
    const rawPath = stripLocalePrefix(location.pathname);
    const path = normalizeUrl(rawPath);

    // Don't redirect admin paths
    if (location.pathname.startsWith('/admin')) return;
    if (checking.current) return;

    if (cache.has(path)) {
      const cached = cache.get(path);
      if (cached && cached !== path) {
        // Reconstruct with locale prefix
        const localeMatch = location.pathname.match(/^\/([a-z]{2})(?=\/|$)/);
        const prefix = localeMatch ? `/${localeMatch[1]}` : '';
        navigate(`${prefix}${cached}`, { replace: true });
      }
      return;
    }

    checking.current = true;

    const check = async () => {
      try {
        let currentPath = path;
        let hops = 0;
        const visited = new Set([path]);
        let redirectId: string | null = null;
        let lastNewUrl: string | null = null;

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

          if (hops === 0) redirectId = data.id;
          visited.add(target);
          currentPath = target;
          hops++;
        }

    // Check if final target is an external URL (stored in new_url)
        const isExternal = lastNewUrl && /^https?:\/\//.test(lastNewUrl);
        const finalTarget = currentPath !== path ? (isExternal ? lastNewUrl! : currentPath) : null;
        cacheSet(path, finalTarget);

        if (finalTarget) {
          if (redirectId) {
            logHit(redirectId, path, isExternal ? finalTarget : currentPath).catch(() => {});
          }
          if (isExternal) {
            window.location.href = finalTarget;
          } else {
            const localeMatch = location.pathname.match(/^\/([a-z]{2})(?=\/|$)/);
            const prefix = localeMatch ? `/${localeMatch[1]}` : '';
            navigate(`${prefix}${finalTarget}`, { replace: true });
          }
        }
      } finally {
        checking.current = false;
      }
    };

    check();
  }, [location.pathname]); // eslint-disable-line

  return null;
}

async function logHit(redirectId: string, oldPath: string, newPath: string) {
  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("redirect_hits")
    .upsert(
      { redirect_id: redirectId, old_path: oldPath, new_path: newPath, day: today, hits: 1 },
      { onConflict: "redirect_id,day" }
    );
}

export function clearRedirectCache() {
  cache.clear();
}
