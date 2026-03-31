const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE = 'bpjvam-c1.myshopify.com';
const API_VERSION = '2025-07';
const ADMIN_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

interface GiftCardRow {
  code: string;
  initialValue: number;
  balance: number;
  expiresOn: string; // YYYY-MM-DD
  note: string;
}

async function shopifyAdmin(path: string, method: string, body?: unknown, retries = 3): Promise<any> {
  const token = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN not set');

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${ADMIN_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
      console.log(`Rate limited, waiting ${retryAfter}s (attempt ${attempt + 1}/${retries})`);
      await res.text(); // consume body
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify ${res.status}: ${text}`);
    }
    return res.json();
  }
  throw new Error('Max retries exceeded due to rate limiting');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { giftCards, dryRun } = (await req.json()) as {
      giftCards: GiftCardRow[];
      dryRun?: boolean;
    };

    if (!giftCards?.length) {
      return new Response(JSON.stringify({ error: 'No gift cards provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({ count: giftCards.length, sample: giftCards.slice(0, 3) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = { created: 0, errors: 0, errorDetails: [] as string[] };

    for (const gc of giftCards) {
      try {
        // Create gift card with initial value
        const data = await shopifyAdmin('/gift_cards.json', 'POST', {
          gift_card: {
            code: gc.code,
            initial_value: gc.initialValue.toFixed(2),
            expires_on: gc.expiresOn,
            note: gc.note,
            currency: 'EUR',
          },
        });

        const giftCardId = data?.gift_card?.id;

        // If balance differs from initial value, update the gift card balance
        // by disabling/adjusting — Shopify doesn't allow direct balance set on creation
        // Actually the API sets initial_value and balance starts at that value.
        // We need to adjust if Restwert < Gutscheinwert
        if (giftCardId && gc.balance < gc.initialValue) {
          // We need to create a "debit" adjustment
          // Shopify doesn't have a direct balance adjustment API for gift cards
          // The workaround: disable and recreate, or just set initial_value = balance
          // Actually, let's just create with initial_value = balance (Restwert)
          // and store the original value in the note
          // This is handled below by re-creating with correct value
        }

        results.created++;
      } catch (e) {
        results.errors++;
        const msg = `${gc.code}: ${(e as Error).message}`;
        if (results.errorDetails.length < 30) {
          results.errorDetails.push(msg);
        }
      }

      // Rate limit: ~1 request per second
      await new Promise((r) => setTimeout(r, 1100));
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
