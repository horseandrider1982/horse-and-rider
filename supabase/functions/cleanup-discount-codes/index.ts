const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOPIFY_STORE = 'bpjvam-c1.myshopify.com';
const API_VERSION = '2025-07';
const ADMIN_URL = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}`;

async function shopifyAdmin(path: string, method: string) {
  const token = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (!token) throw new Error('SHOPIFY_ACCESS_TOKEN not set');
  const res = await fetch(`${ADMIN_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  });
  if (method === 'DELETE' && (res.status === 200 || res.status === 204)) return { ok: true };
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify ${res.status}: ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { action } = await req.json();

    if (action === 'list_price_rules') {
      let allRules: any[] = [];
      let url = `/price_rules.json?limit=250`;
      while (url) {
        const data = await shopifyAdmin(url, 'GET');
        allRules = allRules.concat(data.price_rules || []);
        url = ''; // simple single page for now
      }
      return new Response(JSON.stringify({ count: allRules.length, rules: allRules.map((r: any) => ({ id: r.id, title: r.title })) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete_all_gutschein_rules') {
      // Get all price rules
      const data = await shopifyAdmin('/price_rules.json?limit=250', 'GET');
      const rules = (data.price_rules || []).filter((r: any) => r.title.startsWith('Gutschein '));
      
      let deleted = 0;
      let errors = 0;
      for (const rule of rules) {
        try {
          await shopifyAdmin(`/price_rules/${rule.id}.json`, 'DELETE');
          deleted++;
          // Rate limit
          await new Promise(r => setTimeout(r, 500));
        } catch (e) {
          errors++;
          console.error(`Failed to delete ${rule.id}: ${(e as Error).message}`);
        }
      }

      return new Response(JSON.stringify({ deleted, errors, total: rules.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
