const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CovrPriceResult {
  success: boolean;
  source: 'covrprice';
  fmv?: Record<string, number>;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
    period?: string;
  };
  isKeyIssue?: boolean;
  keyIssueReason?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issue_number, publisher, grade } = await req.json();

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

    // Build search query for CovrPrice
    const searchTerms = [title, `#${issue_number}`];
    if (publisher) searchTerms.push(publisher);
    const searchQuery = `site:covrprice.com ${searchTerms.join(' ')} value`;

    console.log('CovrPrice search query:', searchQuery);

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
      console.log('CovrPrice search failed:', searchData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'covrprice_unavailable',
          message: 'CovrPrice search failed' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = searchData.data || [];
    if (results.length === 0) {
      console.log('No CovrPrice results found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'not_found',
          message: 'Comic not found on CovrPrice' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topResult = results[0];
    const markdown = topResult.markdown || '';
    
    // Parse FMV data
    const fmv: Record<string, number> = {};

    // CovrPrice shows "Raw Value: $XX" and "Slabbed Value: $XX"
    const rawPattern = /raw\s*(?:value)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi;
    const rawMatch = rawPattern.exec(markdown);
    if (rawMatch) {
      const value = parseFloat(rawMatch[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        fmv['raw'] = value;
      }
    }

    // Extract graded values
    const gradePatterns = [
      { grade: '9.8', pattern: /9\.8[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.6', pattern: /9\.6[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.4', pattern: /9\.4[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.2', pattern: /9\.2[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.0', pattern: /9\.0[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
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

    // Extract trend info
    let trend: CovrPriceResult['trend'] = undefined;
    const trendUpPattern = /(?:up|increased?|rising)[:\s]*([\d.]+)%/gi;
    const trendDownPattern = /(?:down|decreased?|falling)[:\s]*([\d.]+)%/gi;
    
    const upMatch = trendUpPattern.exec(markdown);
    const downMatch = trendDownPattern.exec(markdown);
    
    if (upMatch) {
      trend = { direction: 'up', percentage: parseFloat(upMatch[1]), period: '30d' };
    } else if (downMatch) {
      trend = { direction: 'down', percentage: parseFloat(downMatch[1]), period: '30d' };
    }

    // Check for key issue indicators
    const keyIssuePatterns = [
      /first\s*appearance/gi,
      /1st\s*appearance/gi,
      /key\s*issue/gi,
      /origin\s*(?:story|of)/gi,
      /death\s*of/gi,
    ];

    let isKeyIssue = false;
    let keyIssueReason: string | undefined;

    for (const pattern of keyIssuePatterns) {
      const match = pattern.exec(markdown);
      if (match) {
        isKeyIssue = true;
        // Extract surrounding context for the reason
        const idx = markdown.toLowerCase().indexOf(match[0].toLowerCase());
        if (idx >= 0) {
          keyIssueReason = markdown.slice(Math.max(0, idx - 20), Math.min(markdown.length, idx + 50)).trim();
        }
        break;
      }
    }

    const result: CovrPriceResult = {
      success: true,
      source: 'covrprice',
      fmv: Object.keys(fmv).length > 0 ? fmv : undefined,
      trend,
      isKeyIssue,
      keyIssueReason,
    };

    console.log('CovrPrice result:', { hasFmv: !!result.fmv, isKeyIssue: result.isKeyIssue });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('CovrPrice fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'CovrPrice fetch failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
