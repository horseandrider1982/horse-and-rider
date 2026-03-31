import { corsHeaders } from '@supabase/supabase-js/cors';

const SHOPIFY_STORE = 'bpjvam-c1.myshopify.com';
const API_VERSION = '2025-07';
const ADMIN_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

interface VoucherRow {
  code: string;
  value: number;
  endsAt: string; // ISO date
}

async function shopifyAdmin(path: string, method: string, body?: unknown) {
  const token = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN not set');

  const res = await fetch(`${ADMIN_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text}`);
  }
  return res.json();
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vouchers, dryRun } = (await req.json()) as {
      vouchers: VoucherRow[];
      dryRun?: boolean;
    };

    if (!vouchers?.length) {
      return new Response(JSON.stringify({ error: 'No vouchers provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({ count: vouchers.length, sample: vouchers.slice(0, 5) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group by value for price rules
    const grouped = new Map<number, VoucherRow[]>();
    for (const v of vouchers) {
      const list = grouped.get(v.value) || [];
      list.push(v);
      grouped.set(v.value, list);
    }

    const results = { created: 0, errors: 0, errorDetails: [] as string[] };

    for (const [value, codes] of grouped) {
      // Find the latest expiry for this group
      const latestExpiry = codes.reduce((max, c) => (c.endsAt > max ? c.endsAt : max), codes[0].endsAt);

      try {
        // Create price rule
        const prData = await shopifyAdmin('/price_rules.json', 'POST', {
          price_rule: {
            title: `Gutschein ${value} EUR`,
            target_type: 'line_item',
            target_selection: 'all',
            allocation_method: 'across',
            value_type: 'fixed_amount',
            value: `-${value}`,
            customer_selection: 'all',
            usage_limit: 1,
            once_per_customer: true,
            starts_at: '2020-01-01T00:00:00Z',
            ends_at: `${latestExpiry}T23:59:59Z`,
          },
        });

        const priceRuleId = prData.price_rule.id;
        await sleep(300); // rate limit buffer

        // Create discount codes in batches of 20
        for (let i = 0; i < codes.length; i += 20) {
          const batch = codes.slice(i, i + 20);

          // Shopify batch endpoint
          if (batch.length > 1) {
            try {
              await shopifyAdmin(`/price_rules/${priceRuleId}/batch.json`, 'POST', {
                codes: batch.map((c) => ({ code: c.code })),
              });
              results.created += batch.length;
            } catch (batchErr) {
              // Fallback: create one by one
              for (const c of batch) {
                try {
                  await shopifyAdmin(`/price_rules/${priceRuleId}/discount_codes.json`, 'POST', {
                    discount_code: { code: c.code },
                  });
                  results.created++;
                  await sleep(200);
                } catch (e) {
                  results.errors++;
                  results.errorDetails.push(`${c.code}: ${(e as Error).message}`);
                }
              }
            }
          } else {
            try {
              await shopifyAdmin(`/price_rules/${priceRuleId}/discount_codes.json`, 'POST', {
                discount_code: { code: batch[0].code },
              });
              results.created++;
            } catch (e) {
              results.errors++;
              results.errorDetails.push(`${batch[0].code}: ${(e as Error).message}`);
            }
          }
          await sleep(300);
        }
      } catch (e) {
        results.errors += codes.length;
        results.errorDetails.push(`Price rule ${value}EUR: ${(e as Error).message}`);
      }
    }

    // Truncate error details
    if (results.errorDetails.length > 50) {
      results.errorDetails = [...results.errorDetails.slice(0, 50), `... and ${results.errorDetails.length - 50} more`];
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
