const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GPAResult {
  success: boolean;
  source: 'gpa';
  fmv?: Record<string, number>;
  census?: {
    total: number;
    byGrade: Record<string, number>;
  };
  recentSales?: Array<{
    price: number;
    grade: string;
    date: string;
    saleType: string;
  }>;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
  };
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issue_number, publisher, grade, cert_number } = await req.json();

    if (!title || !issue_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and issue number are required' }),
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

    // Build search query for GPA Analytics
    const searchTerms = [title, `#${issue_number}`];
    if (publisher) searchTerms.push(publisher);
    const searchQuery = `site:gpanalysis.com ${searchTerms.join(' ')} CGC`;

    console.log('GPA search query:', searchQuery);

    // Use Firecrawl search to find the comic page
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok || !searchData.success) {
      console.log('GPA search failed:', searchData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'gpa_unavailable',
          message: 'GPA Analytics search failed' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse results from markdown content
    const results = searchData.data || [];
    if (results.length === 0) {
      console.log('No GPA results found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'not_found',
          message: 'Comic not found on GPA Analytics' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract data from the first matching result
    const topResult = results[0];
    const markdown = topResult.markdown || '';
    
    // Parse FMV data from markdown content
    const fmv: Record<string, number> = {};
    const census: Record<string, number> = {};
    const recentSales: GPAResult['recentSales'] = [];

    // Extract grade values using regex patterns
    const gradePatterns = [
      { grade: '9.8', pattern: /9\.8[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.6', pattern: /9\.6[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.4', pattern: /9\.4[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.2', pattern: /9\.2[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.0', pattern: /9\.0[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '8.5', pattern: /8\.5[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '8.0', pattern: /8\.0[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
    ];

    for (const { grade: g, pattern } of gradePatterns) {
      const match = pattern.exec(markdown);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          fmv[g] = value;
        }
      }
    }

    // Extract sale data patterns like "$500 - 9.8 - 12/25/2024"
    const salePattern = /\$?([\d,]+(?:\.\d{2})?)\s*[-–]\s*(\d+\.\d+)\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/gi;
    let saleMatch;
    while ((saleMatch = salePattern.exec(markdown)) !== null && recentSales.length < 10) {
      const price = parseFloat(saleMatch[1].replace(/,/g, ''));
      if (!isNaN(price) && price > 0) {
        recentSales.push({
          price,
          grade: saleMatch[2],
          date: saleMatch[3],
          saleType: 'auction',
        });
      }
    }

    // Extract census data
    const censusPattern = /census[:\s]*(\d+)/gi;
    const censusMatch = censusPattern.exec(markdown);
    const totalCensus = censusMatch ? parseInt(censusMatch[1]) : undefined;

    // Calculate trend from recent sales
    let trend: GPAResult['trend'] = undefined;
    if (recentSales.length >= 2) {
      const sorted = [...recentSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recent = sorted[0].price;
      const older = sorted[sorted.length - 1].price;
      const change = ((recent - older) / older) * 100;
      
      trend = {
        direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        percentage: Math.abs(change),
      };
    }

    const result: GPAResult = {
      success: true,
      source: 'gpa',
      fmv: Object.keys(fmv).length > 0 ? fmv : undefined,
      census: totalCensus ? { total: totalCensus, byGrade: census } : undefined,
      recentSales: recentSales.length > 0 ? recentSales : undefined,
      trend,
    };

    console.log('GPA result:', { hasFmv: !!result.fmv, salesCount: recentSales.length });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('GPA fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'GPA fetch failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
