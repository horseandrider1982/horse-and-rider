import { useActivePropertyConfigs } from "@/hooks/usePropertyConfig";
import { useProductProperties } from "@/hooks/useProductProperties";
import { Tag } from "lucide-react";

interface ProductPropertiesProps {
  handle: string;
  selectedVariantId?: string;
}

/**
 * Renders active xentral_props properties on the product detail page.
 * Variant value beats product value. Empty values are skipped. The whole
 * block is hidden when no values are present.
 */
export function ProductProperties({ handle, selectedVariantId }: ProductPropertiesProps) {
  const { data: configs } = useActivePropertyConfigs();
  const identifiers = (configs ?? []).map((c) => ({
    namespace: c.shopify_namespace,
    key: c.shopify_key,
  }));
  const { data: props } = useProductProperties(handle, identifiers);

  if (!configs || configs.length === 0 || !props) return null;

  const rows = configs
    .map((c) => {
      const variantVal =
        selectedVariantId && props.variants[selectedVariantId]
          ? props.variants[selectedVariantId][c.shopify_key]
          : undefined;
      const productVal = props.product[c.shopify_key];
      const value = variantVal ?? productVal;
      if (!value || value.trim() === "") return null;
      return { config: c, value };
    })
    .filter((r): r is { config: typeof configs[number]; value: string } => r !== null);

  if (rows.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {rows.map(({ config, value }) => (
          <div key={config.id} className="flex items-start gap-3">
            <div className="w-9 h-9 shrink-0 rounded-md bg-primary/5 flex items-center justify-center">
              {config.icon_url ? (
                <img
                  src={config.icon_url}
                  alt=""
                  className="w-7 h-7 object-contain"
                  loading="lazy"
                />
              ) : (
                <Tag className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                {config.label}
              </div>
              <div className="text-sm text-foreground break-words">{formatValue(value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Format Shopify metafield raw values for display:
 * - JSON list values like '["A","B"]' → "A, B"
 * - Number/measurement JSON like '{"value":10000,"unit":"MILLIMETERS"}' → "10000 mm"
 * - Booleans → Ja/Nein
 * - Otherwise: raw string
 */
function formatValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  if (trimmed === "true") return "Ja";
  if (trimmed === "false") return "Nein";

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).join(", ");
      if (parsed && typeof parsed === "object") {
        if ("value" in parsed) {
          const unit = (parsed as { unit?: string }).unit;
          const val = String((parsed as { value: unknown }).value);
          const unitLabel = unit ? unitMap(String(unit)) : "";
          return unitLabel ? `${val} ${unitLabel}` : val;
        }
        return JSON.stringify(parsed);
      }
    } catch {
      // fall through
    }
  }
  return trimmed;
}

function unitMap(unit: string): string {
  const u = unit.toUpperCase();
  const map: Record<string, string> = {
    MILLIMETERS: "mm",
    CENTIMETERS: "cm",
    METERS: "m",
    INCHES: "in",
    GRAMS: "g",
    KILOGRAMS: "kg",
    OUNCES: "oz",
    POUNDS: "lb",
    MILLILITERS: "ml",
    LITERS: "l",
  };
  return map[u] ?? unit.toLowerCase();
}
