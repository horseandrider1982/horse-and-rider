// Real User Monitoring via web-vitals → GA4 (über GTM dataLayer)
// Misst LCP, CLS, INP, FCP, TTFB pro Seitenaufruf und schickt jeden Wert
// als Custom Event "web_vitals" an GA4. In GA4 → Events → web_vitals
// kannst du die Werte (inkl. LCP-Element-Selector) auswerten.
import { onLCP, onCLS, onINP, onFCP, onTTFB, type Metric } from "web-vitals";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  // Google Core Web Vitals Schwellen
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    INP: [200, 500],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name] ?? [Infinity, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function extractElementInfo(metric: Metric): string | undefined {
  // LCP/CLS liefern entries mit Element-Referenz → daraus Selector bauen
  for (const entry of metric.entries as PerformanceEntry[]) {
    const el = (entry as unknown as { element?: Element }).element;
    if (el && el.tagName) {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
    }
  }
  return undefined;
}

function send(metric: Metric) {
  const value = metric.name === "CLS" ? metric.value : Math.round(metric.value);
  const payload = {
    event: "web_vitals",
    metric_name: metric.name,
    metric_value: value,
    metric_delta: metric.name === "CLS" ? metric.delta : Math.round(metric.delta),
    metric_id: metric.id,
    metric_rating: getRating(metric.name, metric.value),
    metric_navigation_type: metric.navigationType,
    metric_element: extractElementInfo(metric),
    page_path: window.location.pathname + window.location.search,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[web-vitals]", metric.name, value, payload.metric_rating, payload.metric_element ?? "");
  }
}

let initialized = false;
export function initWebVitals() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    onLCP(send);
    onCLS(send);
    onINP(send);
    onFCP(send);
    onTTFB(send);
  } catch (err) {
    // niemals den Render blockieren
    // eslint-disable-next-line no-console
    console.warn("[web-vitals] init failed", err);
  }
}
