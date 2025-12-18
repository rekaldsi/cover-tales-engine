import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EBAY_API_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

interface EbayPriceResult {
  success: boolean;
  source: 'ebay_estimate';
  averageAskingPrice?: number;
  estimatedSoldPrice?: number;
  lowestPrice?: number;
  highestPrice?: number;
  listingCount: number;
  listings?: Array<{
    title: string;
    price: number;
    condition: string;
    imageUrl?: string;
    itemUrl: string;
  }>;
  error?: string;
}

async function getEbayAccessToken(appId: string, certId: string): Promise<string | null> {
  try {
    const credentials = btoa(`${appId}:${certId}`);
    
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    });

    if (!response.ok) {
      console.error('eBay auth failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('eBay auth error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, grade, gradeStatus } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required', listingCount: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const EBAY_APP_ID = Deno.env.get('EBAY_APP_ID');
    const EBAY_CERT_ID = Deno.env.get('EBAY_CERT_ID');

    if (!EBAY_APP_ID || !EBAY_CERT_ID) {
      console.log('eBay API keys not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'eBay API not configured',
          source: 'ebay_estimate',
          listingCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const accessToken = await getEbayAccessToken(EBAY_APP_ID, EBAY_CERT_ID);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to authenticate with eBay',
          source: 'ebay_estimate',
          listingCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    let searchQuery = `${title}`;
    if (issueNumber) {
      searchQuery += ` #${issueNumber}`;
    }
    if (publisher) {
      searchQuery += ` ${publisher}`;
    }
    if (gradeStatus && gradeStatus !== 'raw') {
      searchQuery += ` ${gradeStatus.toUpperCase()}`;
      if (grade) {
        searchQuery += ` ${grade}`;
      }
    }
    searchQuery += ' comic';

    console.log('eBay search query:', searchQuery);

    // Search eBay Browse API for active listings
    const searchUrl = new URL(EBAY_API_URL);
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('limit', '25');
    searchUrl.searchParams.set('category_ids', '63'); // Comics category
    searchUrl.searchParams.set('sort', 'price');

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'eBay search failed',
          source: 'ebay_estimate',
          listingCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const items = data.itemSummaries || [];

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          source: 'ebay_estimate',
          listingCount: 0,
          error: 'No listings found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract prices
    const prices: number[] = [];
    const listings: EbayPriceResult['listings'] = [];

    for (const item of items) {
      const price = parseFloat(item.price?.value || '0');
      if (price > 0) {
        prices.push(price);
        listings.push({
          title: item.title,
          price,
          condition: item.condition || 'Unknown',
          imageUrl: item.thumbnailImages?.[0]?.imageUrl,
          itemUrl: item.itemWebUrl,
        });
      }
    }

    if (prices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          source: 'ebay_estimate',
          listingCount: 0,
          error: 'No valid prices found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics
    const sortedPrices = [...prices].sort((a, b) => a - b);
    const lowestPrice = sortedPrices[0];
    const highestPrice = sortedPrices[sortedPrices.length - 1];
    const averageAskingPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Estimate sold price: Apply 15-20% discount to average asking
    // Items typically sell below asking price
    const discountRate = 0.18; // 18% average discount
    const estimatedSoldPrice = Math.round(averageAskingPrice * (1 - discountRate));

    console.log(`eBay results: ${prices.length} listings, avg asking: $${averageAskingPrice.toFixed(2)}, estimated sold: $${estimatedSoldPrice}`);

    const result: EbayPriceResult = {
      success: true,
      source: 'ebay_estimate',
      averageAskingPrice: Math.round(averageAskingPrice),
      estimatedSoldPrice,
      lowestPrice: Math.round(lowestPrice),
      highestPrice: Math.round(highestPrice),
      listingCount: prices.length,
      listings: listings.slice(0, 5), // Return top 5 for display
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('eBay price fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'ebay_estimate',
        listingCount: 0 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
