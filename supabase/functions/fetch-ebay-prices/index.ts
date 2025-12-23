import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// eBay Finding API endpoint for completed items (actual sold data)
const EBAY_FINDING_API_URL = 'https://svcs.ebay.com/services/search/FindingService/v1';

interface EbaySoldResult {
  success: boolean;
  source: 'ebay_sold';
  averageSoldPrice?: number;
  medianSoldPrice?: number;
  lowestSoldPrice?: number;
  highestSoldPrice?: number;
  soldCount: number;
  recentSales?: Array<{
    title: string;
    price: number;
    soldDate: string;
    condition?: string;
    itemUrl: string;
  }>;
  priceHistory?: Array<{
    date: string;
    price: number;
    grade?: string;
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, grade, gradeStatus } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required', soldCount: 0 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const EBAY_APP_ID = Deno.env.get('EBAY_APP_ID');

    if (!EBAY_APP_ID) {
      console.log('eBay APP_ID not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'eBay API not configured',
          source: 'ebay_sold',
          soldCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for Finding API
    let keywords = `${title}`;
    if (issueNumber) {
      keywords += ` #${issueNumber}`;
    }
    if (publisher) {
      keywords += ` ${publisher}`;
    }
    if (gradeStatus && gradeStatus !== 'raw') {
      keywords += ` ${gradeStatus.toUpperCase()}`;
      if (grade) {
        keywords += ` ${grade}`;
      }
    }
    keywords += ' comic';

    console.log('eBay Finding API search:', keywords);

    // Call eBay Finding API - findCompletedItems for actual sold data
    const findingUrl = new URL(EBAY_FINDING_API_URL);
    findingUrl.searchParams.set('OPERATION-NAME', 'findCompletedItems');
    findingUrl.searchParams.set('SERVICE-VERSION', '1.13.0');
    findingUrl.searchParams.set('SECURITY-APPNAME', EBAY_APP_ID);
    findingUrl.searchParams.set('RESPONSE-DATA-FORMAT', 'JSON');
    findingUrl.searchParams.set('REST-PAYLOAD', 'true');
    findingUrl.searchParams.set('keywords', keywords);
    findingUrl.searchParams.set('categoryId', '63'); // Comics category
    findingUrl.searchParams.set('paginationInput.entriesPerPage', '50');
    findingUrl.searchParams.set('sortOrder', 'EndTimeSoonest');
    // Only get sold items (not unsold completed auctions)
    findingUrl.searchParams.set('itemFilter(0).name', 'SoldItemsOnly');
    findingUrl.searchParams.set('itemFilter(0).value', 'true');

    const response = await fetch(findingUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay Finding API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'eBay Finding API failed',
          source: 'ebay_sold',
          soldCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Parse Finding API response structure
    const searchResult = data.findCompletedItemsResponse?.[0];
    const ack = searchResult?.ack?.[0];
    
    if (ack !== 'Success') {
      const errorMsg = searchResult?.errorMessage?.[0]?.error?.[0]?.message?.[0] || 'Unknown error';
      console.error('eBay Finding API ack failed:', errorMsg);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          source: 'ebay_sold',
          soldCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items = searchResult?.searchResult?.[0]?.item || [];
    
    if (items.length === 0) {
      console.log('No sold listings found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          source: 'ebay_sold',
          soldCount: 0,
          error: 'No sold listings found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract actual sold prices
    const soldPrices: number[] = [];
    const recentSales: EbaySoldResult['recentSales'] = [];
    const priceHistory: EbaySoldResult['priceHistory'] = [];

    for (const item of items) {
      // Only process items that actually sold
      const sellingStatus = item.sellingStatus?.[0];
      const sellingState = sellingStatus?.sellingState?.[0];
      
      if (sellingState !== 'EndedWithSales') continue;
      
      const priceInfo = sellingStatus?.convertedCurrentPrice?.[0] || sellingStatus?.currentPrice?.[0];
      const price = parseFloat(priceInfo?.['__value__'] || priceInfo || '0');
      
      if (price > 0) {
        soldPrices.push(price);
        
        const endTime = item.listingInfo?.[0]?.endTime?.[0] || '';
        const itemTitle = item.title?.[0] || '';
        const itemUrl = item.viewItemURL?.[0] || '';
        const condition = item.condition?.[0]?.conditionDisplayName?.[0] || '';
        
        recentSales.push({
          title: itemTitle,
          price,
          soldDate: endTime,
          condition,
          itemUrl,
        });

        priceHistory.push({
          date: endTime.split('T')[0],
          price,
        });
      }
    }

    if (soldPrices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          source: 'ebay_sold',
          soldCount: 0,
          error: 'No valid sold prices found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate statistics from ACTUAL sold prices
    const sortedPrices = [...soldPrices].sort((a, b) => a - b);
    const lowestSoldPrice = sortedPrices[0];
    const highestSoldPrice = sortedPrices[sortedPrices.length - 1];
    const averageSoldPrice = soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length;
    
    // Calculate median (more accurate than average for outliers)
    const mid = Math.floor(sortedPrices.length / 2);
    const medianSoldPrice = sortedPrices.length % 2 
      ? sortedPrices[mid] 
      : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

    console.log(`eBay SOLD results: ${soldPrices.length} sales, median: $${medianSoldPrice.toFixed(2)}, avg: $${averageSoldPrice.toFixed(2)}`);

    const result: EbaySoldResult = {
      success: true,
      source: 'ebay_sold',
      averageSoldPrice: Math.round(averageSoldPrice * 100) / 100,
      medianSoldPrice: Math.round(medianSoldPrice * 100) / 100,
      lowestSoldPrice: Math.round(lowestSoldPrice * 100) / 100,
      highestSoldPrice: Math.round(highestSoldPrice * 100) / 100,
      soldCount: soldPrices.length,
      recentSales: recentSales.slice(0, 10), // Return top 10 for display
      priceHistory: priceHistory.slice(0, 20), // Last 20 for charting
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('eBay sold price fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'ebay_sold',
        soldCount: 0 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
