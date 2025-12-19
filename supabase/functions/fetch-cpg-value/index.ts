import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, grade } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query for ComicsPriceGuide
    const cleanTitle = title.replace(/[^\w\s]/g, ' ').trim();
    const cleanIssue = (issueNumber || '1').toString().replace(/^#/, '').trim();
    const searchQuery = `${cleanTitle} ${cleanIssue}`;
    const searchUrl = `https://www.comicspriceguide.com/search?q=${encodeURIComponent(searchQuery)}`;

    console.log('Scraping CPG for:', searchQuery);
    console.log('URL:', searchUrl);

    // Use Firecrawl to scrape the search results
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        waitFor: 3000, // Wait for JS to load
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Firecrawl error:', scrapeResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape pricing data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const html = scrapeData.data?.html || scrapeData.html || '';

    console.log('Scraped content length:', markdown.length);

    // Parse prices from the scraped content
    // CPG typically shows prices in format like "$XX.XX" or price tables
    const priceMatches = markdown.match(/\$\d+(?:,\d{3})*(?:\.\d{2})?/g) || [];
    const prices = priceMatches
      .map((p: string) => parseFloat(p.replace(/[$,]/g, '')))
      .filter((p: number) => p > 0 && p < 100000) // Filter unrealistic prices
      .sort((a: number, b: number) => a - b);

    console.log('Found prices:', prices.slice(0, 10));

    if (prices.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No pricing data found',
          scraped: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate value estimates
    // For raw comics, assume VG/FN (5.0) as default if no grade specified
    const assumedGrade = grade || '5.0';
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const lowPrice = prices[0];
    const highPrice = prices[prices.length - 1];
    const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

    // Use median as primary value estimate (more robust than average)
    const estimatedValue = medianPrice;

    console.log('CPG value estimate:', {
      title,
      issueNumber: cleanIssue,
      assumedGrade,
      estimatedValue,
      priceRange: [lowPrice, highPrice],
      priceCount: prices.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        source: 'comicspriceguide',
        fmv: {
          current: estimatedValue,
          raw: estimatedValue,
        },
        priceRange: {
          low: lowPrice,
          high: highPrice,
          median: medianPrice,
          average: Math.round(avgPrice * 100) / 100,
        },
        assumedGrade,
        priceCount: prices.length,
        confidence: prices.length >= 5 ? 'medium' : 'low',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching CPG value:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
