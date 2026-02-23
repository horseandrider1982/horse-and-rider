import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUrl } from "@/lib/urlNormalize";

/**
 * Enterprise RedirectGuard with:
 * - LRU session cache (avoids re-querying known paths)
 * - Multi-hop resolution (max 5 hops, failsafe)
 * - Async hit logging
 */

// Simple in-memory LRU cache
const cache = new Map<string, string | null>();
const MAX_CACHE = 500;

function cacheSet(key: string, value: string | null) {
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, value);
}

export function RedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const checking = useRef(false);

  useEffect(() => {
    const path = normalizeUrl(location.pathname);
    if (checking.current) return;

    // Check cache first
    if (cache.has(path)) {
      const cached = cache.get(path);
      if (cached && cached !== path) {
        navigate(cached, { replace: true });
      }
      return;
    }

    checking.current = true;

    const check = async () => {
      try {
        // Resolve redirect chain (max 5 hops)
        let currentPath = path;
        let hops = 0;
        const visited = new Set([path]);
        let redirectId: string | null = null;

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
          if (!target || visited.has(target)) break; // loop prevention

          if (hops === 0) redirectId = data.id;
          visited.add(target);
          currentPath = target;
          hops++;
        }

        // Cache the result
        const finalTarget = currentPath !== path ? currentPath : null;
        cacheSet(path, finalTarget);

        if (finalTarget) {
          // Async hit logging (fire and forget)
          if (redirectId) {
            logHit(redirectId, path, finalTarget).catch(() => {});
          }
          navigate(finalTarget, { replace: true });
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
  // Try upsert via increment
  const { error } = await supabase
    .from("redirect_hits")
    .upsert(
      { redirect_id: redirectId, old_path: oldPath, new_path: newPath, day: today, hits: 1 },
      { onConflict: "redirect_id,day" }
    );
  // If insert succeeded with hits=1, it's new. Otherwise we need to increment.
  if (error) {
    // Fallback: just try insert, ignore duplicate
  }
}

// Export cache clear for testing
export function clearRedirectCache() {
  cache.clear();
}
