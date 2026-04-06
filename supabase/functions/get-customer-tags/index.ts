const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SHOPIFY_STORE = "bpjvam-c1.myshopify.com";
const API_VERSION = "2025-01";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { shopify_customer_id } = await req.json();

    if (!shopify_customer_id) {
      return new Response(
        JSON.stringify({ error: "shopify_customer_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const numericId = shopify_customer_id.replace(/^gid:\/\/shopify\/Customer\//, "");

    const token = Deno.env.get("SHOPIFY_NAVIGATION_TOKEN") || Deno.env.get("SHOPIFY_ACCESS_TOKEN");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "No Shopify admin token configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    };
    const apiUrl = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/graphql.json`;

    // Step 1: Fetch customer tags
    const tagsQuery = `
      query GetCustomerTags($id: ID!) {
        customer(id: $id) {
          tags
        }
      }
    `;
    const tagsRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: tagsQuery,
        variables: { id: `gid://shopify/Customer/${numericId}` },
      }),
    });

    let allTags: string[] = [];
    if (tagsRes.ok) {
      const tagsData = await tagsRes.json();
      allTags = tagsData?.data?.customer?.tags || [];
      console.log("Customer tags:", allTags);
    } else {
      console.error("Tags fetch error:", await tagsRes.text());
    }

    // Step 2: Fetch all segments whose name contains "Card"
    const segmentsQuery = `
      query GetSegments {
        segments(first: 50) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;
    const segRes = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: segmentsQuery }),
    });

    const cardSegments: string[] = [];

    if (segRes.ok) {
      const segData = await segRes.json();
      console.log("Full segments response:", JSON.stringify(segData));
      const segments = segData?.data?.segments?.edges || [];
      console.log("All segments:", segments.map((e: any) => e.node.name));

      // Filter segments containing "Card" (case-insensitive)
      const cardSegs = segments.filter((e: any) =>
        e.node.name.toLowerCase().includes("card")
      );

      // Step 3: Check if customer is member of each card segment
      for (const seg of cardSegs) {
        const memberQuery = `
          query CheckMembership($segmentId: ID!, $query: String) {
            customerSegmentMembers(segmentId: $segmentId, first: 1, query: $query) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `;
        const memberRes = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: memberQuery,
            variables: {
              segmentId: seg.node.id,
              query: `customer_id:${numericId}`,
            },
          }),
        });

        if (memberRes.ok) {
          const memberData = await memberRes.json();
          const members = memberData?.data?.customerSegmentMembers?.edges || [];
          if (members.length > 0) {
            cardSegments.push(seg.node.name);
            console.log(`Customer IS member of segment: ${seg.node.name}`);
          }
        } else {
          console.error(`Segment membership check failed for ${seg.node.name}:`, await memberRes.text());
        }
      }
    } else {
      console.error("Segments fetch error:", await segRes.text());
    }

    // Combine: tags containing "card" + segment names
    const cardTags = allTags.filter((t: string) =>
      t.toLowerCase().includes("card")
    );

    // Merge both sources
    const allCardIndicators = [...new Set([...cardTags, ...cardSegments])];

    return new Response(
      JSON.stringify({ tags: allTags, cardTags: allCardIndicators, cardSegments }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-customer-tags error:", err);
    return new Response(
      JSON.stringify({ error: err.message, tags: [], cardTags: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
