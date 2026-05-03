import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Fires a GA4 `page_view` event on every SPA route change.
 * GTM Setup hint: set `send_page_view: false` on the GA4 Configuration tag
 * and trigger a GA4 Event tag on Custom Event = `page_view`.
 */
export function useGA4PageView() {
  const { pathname, search } = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const fullPath = pathname + search;
    if (lastPath.current === fullPath) return;
    lastPath.current = fullPath;

    // Wait one tick so document.title is updated by usePageMeta
    const id = window.setTimeout(() => {
      const w = window as unknown as { dataLayer: Record<string, unknown>[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({
        event: "page_view",
        page_location: window.location.href,
        page_path: fullPath,
        page_title: document.title,
      });
    }, 50);
    return () => window.clearTimeout(id);
  }, [pathname, search]);
}
