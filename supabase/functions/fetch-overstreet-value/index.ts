const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverstreetResult {
  success: boolean;
  source: 'overstreet';
  fmv?: Record<string, number>;
  guideYear?: number;
  isKeyIssue?: boolean;
  keyIssueReason?: string;
  historicalData?: {
    year: number;
    value: number;
    grade: string;
  }[];
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

    // Build search query for Overstreet
    const searchTerms = [title, `#${issue_number}`];
    if (publisher) searchTerms.push(publisher);
    const searchQuery = `site:overstreetaccess.com OR site:comicbookrealm.com overstreet ${searchTerms.join(' ')} price guide`;

    console.log('Overstreet search query:', searchQuery);

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
      console.log('Overstreet search failed:', searchData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'overstreet_unavailable',
          message: 'Overstreet search failed' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = searchData.data || [];
    if (results.length === 0) {
      console.log('No Overstreet results found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'not_found',
          message: 'Comic not found in Overstreet' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topResult = results[0];
    const markdown = topResult.markdown || '';
    
    // Parse Overstreet condition-based pricing
    // Overstreet uses GD (2.0), VG (4.0), FN (6.0), VF (8.0), NM (9.4) scale
    const fmv: Record<string, number> = {};

    const conditionPatterns = [
      { grade: '2.0', pattern: /(?:GD|Good)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '4.0', pattern: /(?:VG|Very\s*Good)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '6.0', pattern: /(?:FN|Fine)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '8.0', pattern: /(?:VF|Very\s*Fine)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.2', pattern: /(?:NM-|Near\s*Mint\s*-)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.4', pattern: /(?:NM|Near\s*Mint)[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
    ];

    for (const { grade: g, pattern } of conditionPatterns) {
      const match = pattern.exec(markdown);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          fmv[g] = value;
        }
      }
    }

    // Also try numeric grade patterns
    const numericPatterns = [
      { grade: '9.8', pattern: /9\.8[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.6', pattern: /9\.6[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.4', pattern: /9\.4[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
      { grade: '9.0', pattern: /9\.0[:\s]*\$?([\d,]+(?:\.\d{2})?)/gi },
    ];

    for (const { grade: g, pattern } of numericPatterns) {
      if (!fmv[g]) {
        const match = pattern.exec(markdown);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(value) && value > 0) {
            fmv[g] = value;
          }
        }
      }
    }

    // Extract guide year
    const yearPattern = /(?:overstreet|price\s*guide)\s*(\d{4})/gi;
    const yearMatch = yearPattern.exec(markdown);
    const guideYear = yearMatch ? parseInt(yearMatch[1]) : undefined;

    // Check for key issue markers
    const keyIssuePatterns = [
      { pattern: /first\s*appearance\s*(?:of\s*)?([\w\s]+)/gi, type: 'first_appearance' },
      { pattern: /1st\s*appearance\s*(?:of\s*)?([\w\s]+)/gi, type: 'first_appearance' },
      { pattern: /origin\s*(?:story\s*)?(?:of\s*)?([\w\s]+)/gi, type: 'origin' },
      { pattern: /death\s*(?:of\s*)?([\w\s]+)/gi, type: 'death' },
      { pattern: /classic\s*cover/gi, type: 'classic_cover' },
    ];

    let isKeyIssue = false;
    let keyIssueReason: string | undefined;

    for (const { pattern, type } of keyIssuePatterns) {
      const match = pattern.exec(markdown);
      if (match) {
        isKeyIssue = true;
        keyIssueReason = match[0].trim();
        break;
      }
    }

    const result: OverstreetResult = {
      success: true,
      source: 'overstreet',
      fmv: Object.keys(fmv).length > 0 ? fmv : undefined,
      guideYear,
      isKeyIssue,
      keyIssueReason,
    };

    console.log('Overstreet result:', { hasFmv: !!result.fmv, guideYear: result.guideYear });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Overstreet fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Overstreet fetch failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
