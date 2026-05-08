// Berechnet Facetten (Vendor + xentral_props Properties) für Kollektionen
// und schreibt sie in die Tabelle collection_facets_cache.
//
// Aufrufe:
//   POST { handle?: string, locale?: string, all?: boolean }
//   - handle + locale: nur diese eine Kombi neu berechnen
//   - all=true: alle Kollektionen × alle Locales (vom Cron benutzt)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_API_VERSION = '2025-07';
const SHOPIFY_DOMAIN = 'bpjvam-c1.myshopify.com';
const SHOPIFY_URL = `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
const SHOPIFY_TOKEN = Deno.env.get('SHOPIFY_STOREFRONT_ACCESS_TOKEN') ?? 'd69c81decdb58ced137c44fa1b033aa3';

const PAGE_SIZE = 100;
const MAX_PAGES_PER_COLLECTION = 30; // safety: 3000 products

interface MetafieldNode {
  namespace: string;
  key: string;
  value: string | null;
  type: string;
}

const COLLECTION_QUERY = `
  query GetCollectionForFacets(
    $handle: String!,
    $first: Int!,
    $after: String,
    $language: LanguageCode,
    $xentralIds: [HasMetafieldsIdentifier!]! = []
  ) @inContext(language: $language) {
    collection(handle: $handle) {
      products(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges {
          node {
            vendor
            metafields(identifiers: [
              {namespace: "custom", key: "lieferantenbestand"},
              {namespace: "custom", key: "ueberverkauf"}
            ]) { namespace key value type }
            xentralMetafields: metafields(identifiers: $xentralIds) {
              namespace key value type
            }
            variants(first: 50) {
              edges {
                node {
                  availableForSale
                  currentlyNotInStock
                  metafields(identifiers: [
                    {namespace: "custom", key: "lieferantenbestand"},
                    {namespace: "custom", key: "ueberverkauf"}
                  ]) { namespace key value type }
                  xentralMetafields: metafields(identifiers: $xentralIds) {
                    namespace key value type
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function shopifyRequest(query: string, variables: Record<string, unknown>) {
  const res = await fetch(SHOPIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify: ${JSON.stringify(json.errors)}`);
  return json.data;
}

function getMf(mfs: (MetafieldNode | null)[] | undefined, key: string): string {
  if (!mfs) return '';
  const found = mfs.find((m) => m && m.key === key);
  return found?.value ?? '';
}

function isVariantVisible(
  variant: any,
  productMfs: (MetafieldNode | null)[] | undefined,
  isSingleVariant: boolean,
): boolean {
  // Trust Shopify: any variant marked availableForSale is purchasable
  // (covers normal stock AND inventory_policy=CONTINUE / untracked inventory)
  if (variant.availableForSale) return true;

  const checkSupplier = (mfs: (MetafieldNode | null)[] | undefined) => {
    const stock = parseInt(getMf(mfs, 'lieferantenbestand')) || 0;
    const oversell = getMf(mfs, 'ueberverkauf');
    return stock > 0 && oversell === '1';
  };

  if (isSingleVariant && checkSupplier(productMfs)) return true;
  return checkSupplier(variant.metafields);
}

function isProductVisible(node: any): boolean {
  const variants = node.variants?.edges || [];
  const single = variants.length <= 1;
  for (const { node: v } of variants) {
    if (isVariantVisible(v, node.metafields, single)) return true;
  }
  return false;
}

function extractMfValues(mf: MetafieldNode | null | undefined): string[] {
  if (!mf || mf.value == null || mf.value === '') return [];
  const v = mf.value.trim();
  if (v.startsWith('[')) {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String).map((x) => x.trim()).filter(Boolean);
    } catch { /* */ }
  }
  return [v];
}

async function computeFacets(
  handle: string,
  locale: string,
  xentralIds: Array<{ namespace: string; key: string }>,
  propertyConfigs: Array<{ shopify_key: string; label: string; display_order: number }>,
) {
  const vendorCounts = new Map<string, number>();
  const propCounts = new Map<string, Map<string, number>>();
  let productCount = 0;
  let cursor: string | null = null;
  let pages = 0;

  while (pages < MAX_PAGES_PER_COLLECTION) {
    pages++;
    const data = await shopifyRequest(COLLECTION_QUERY, {
      handle,
      first: PAGE_SIZE,
      after: cursor,
      language: locale.toUpperCase(),
      xentralIds,
    });
    const collection = data?.collection;
    if (!collection) break;
    const edges = collection.products?.edges || [];
    for (const { node } of edges) {
      if (!isProductVisible(node)) continue;
      productCount++;
      if (node.vendor) {
        vendorCounts.set(node.vendor, (vendorCounts.get(node.vendor) || 0) + 1);
      }
      // collect property values (product + variant level, dedupe per product)
      const seenByKey = new Map<string, Set<string>>();
      const collect = (mfs: (MetafieldNode | null)[] | undefined) => {
        if (!mfs) return;
        for (const mf of mfs) {
          if (!mf) continue;
          const vals = extractMfValues(mf);
          if (!vals.length) continue;
          let bucket = seenByKey.get(mf.key);
          if (!bucket) { bucket = new Set(); seenByKey.set(mf.key, bucket); }
          for (const v of vals) bucket.add(v);
        }
      };
      collect(node.xentralMetafields);
      for (const { node: v } of node.variants?.edges || []) {
        collect(v.xentralMetafields);
      }
      for (const [key, vals] of seenByKey) {
        let group = propCounts.get(key);
        if (!group) { group = new Map(); propCounts.set(key, group); }
        for (const val of vals) group.set(val, (group.get(val) || 0) + 1);
      }
    }
    const pi = collection.products?.pageInfo;
    if (!pi?.hasNextPage) break;
    cursor = pi.endCursor;
  }

  const vendors = Array.from(vendorCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const properties = propertyConfigs
    .map((cfg) => {
      const bucket = propCounts.get(cfg.shopify_key);
      if (!bucket || bucket.size === 0) return null;
      const values = Array.from(bucket.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, undefined, { numeric: true }));
      return { key: cfg.shopify_key, label: cfg.label, values };
    })
    .filter(Boolean);

  return { vendors, properties, productCount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { handle, locale, all } = body as { handle?: string; locale?: string; all?: boolean };

    // load active property configs once
    const { data: cfgs, error: cfgErr } = await supabase
      .from('product_property_display_config')
      .select('shopify_namespace, shopify_key, label, display_order')
      .eq('is_active', true)
      .order('display_order');
    if (cfgErr) throw cfgErr;
    const xentralIds = (cfgs || []).map((c) => ({ namespace: c.shopify_namespace, key: c.shopify_key }));

    // Locales: alle aus ui_translations (distinct), Fallback ['de']
    const { data: localeRows } = await supabase
      .from('ui_translations')
      .select('locale')
      .limit(5000);
    const allLocales = Array.from(new Set((localeRows || []).map((r: any) => r.locale).filter(Boolean)));
    if (!allLocales.length) allLocales.push('de');

    let targets: Array<{ handle: string; locale: string }> = [];
    if (all) {
      // collect handles from public_routes (entity_type collection)
      const { data: routes } = await supabase
        .from('public_routes')
        .select('current_path')
        .eq('entity_type', 'collection')
        .eq('is_public', true)
        .limit(2000);
      const handles = (routes || [])
        .map((r: any) => {
          const m = String(r.current_path || '').match(/\/collections\/([^/?#]+)/);
          return m ? m[1] : null;
        })
        .filter((h: string | null): h is string => !!h);
      const uniq = Array.from(new Set(handles));
      for (const h of uniq) for (const l of allLocales) targets.push({ handle: h, locale: l });
    } else if (handle) {
      const locs = locale ? [locale] : allLocales;
      for (const l of locs) targets.push({ handle, locale: l });
    } else {
      return new Response(JSON.stringify({ error: 'handle or all=true required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ handle: string; locale: string; status: string; product_count?: number; error?: string }> = [];
    for (const t of targets) {
      try {
        const { vendors, properties, productCount } = await computeFacets(
          t.handle, t.locale, xentralIds, cfgs || [],
        );
        const { error: upErr } = await supabase
          .from('collection_facets_cache')
          .upsert({
            handle: t.handle,
            locale: t.locale,
            vendors,
            properties,
            product_count: productCount,
            computed_at: new Date().toISOString(),
          }, { onConflict: 'handle,locale' });
        if (upErr) throw upErr;
        results.push({ handle: t.handle, locale: t.locale, status: 'ok', product_count: productCount });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ handle: t.handle, locale: t.locale, status: 'error', error: msg });
        console.error(`Failed ${t.handle}/${t.locale}:`, msg);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('compute-collection-facets failed:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
