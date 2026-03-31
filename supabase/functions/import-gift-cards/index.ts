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
  const token = Deno.env.get('SHOPIFY_GIFTCARD_TOKEN');
  if (!token) throw new Error('SHOPIFY_GIFTCARD_TOKEN not set');

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
    const body = await req.json();
    const { giftCards, dryRun, action } = body as {
      giftCards?: GiftCardRow[];
      dryRun?: boolean;
      action?: string;
    };

    // Count gift cards in Shopify
    if (action === 'count') {
      const data = await shopifyAdmin('/gift_cards/count.json', 'GET');
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        const noteText = gc.balance < gc.initialValue
          ? `${gc.note} | Originalwert: ${gc.initialValue.toFixed(2)} EUR`
          : gc.note;

        await shopifyAdmin('/gift_cards.json', 'POST', {
          gift_card: {
            code: gc.code,
            initial_value: gc.balance.toFixed(2),
            expires_on: gc.expiresOn,
            note: noteText,
            currency: 'EUR',
          },
        });

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
