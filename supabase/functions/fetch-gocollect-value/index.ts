const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValueRequest {
  title: string;
  issue_number: string;
  publisher?: string;
  grade?: number;
  cert_number?: string;
}

interface FMVData {
  raw?: number;
  '9.8'?: number;
  '9.6'?: number;
  '9.4'?: number;
  '9.2'?: number;
  '9.0'?: number;
  '8.0'?: number;
  current?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOCOLLECT_API_KEY = Deno.env.get('GOCOLLECT_API_KEY');
    if (!GOCOLLECT_API_KEY) {
      throw new Error('GOCOLLECT_API_KEY not configured');
    }

    const body: ValueRequest = await req.json();
    const { title, issue_number, publisher, grade, cert_number } = body;

    if (!title || !issue_number) {
      throw new Error('Title and issue number are required');
    }

    console.log(`Fetching GoCollect value for: ${title} #${issue_number}`);

    // Build search query
    const searchParams = new URLSearchParams({
      q: `${title} ${issue_number}`,
      type: 'comic',
    });

    if (publisher) {
      searchParams.append('publisher', publisher);
    }

    // Search for the comic in GoCollect
    const searchResponse = await fetch(
      `https://api.gocollect.com/api/v1/search?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${GOCOLLECT_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error(`GoCollect search error: ${searchResponse.status}`);
      throw new Error('Failed to search GoCollect');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Comic not found in GoCollect database',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Get the first matching result
    const comicId = searchData.data[0].id;

    // Fetch detailed pricing/insights for this comic
    const insightsResponse = await fetch(
      `https://api.gocollect.com/api/v1/insights/${comicId}`,
      {
        headers: {
          'Authorization': `Bearer ${GOCOLLECT_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!insightsResponse.ok) {
      console.error(`GoCollect insights error: ${insightsResponse.status}`);
      throw new Error('Failed to fetch pricing data');
    }

    const insightsData = await insightsResponse.json();

    // Extract FMV data at various grades
    const fmvData: FMVData = {};
    
    if (insightsData.fmv) {
      // Map GoCollect's FMV structure to our format
      fmvData.raw = insightsData.fmv.raw || insightsData.fmv['0.5'];
      fmvData['9.8'] = insightsData.fmv['9.8'];
      fmvData['9.6'] = insightsData.fmv['9.6'];
      fmvData['9.4'] = insightsData.fmv['9.4'];
      fmvData['9.2'] = insightsData.fmv['9.2'];
      fmvData['9.0'] = insightsData.fmv['9.0'];
      fmvData['8.0'] = insightsData.fmv['8.0'];
      
      // If a specific grade was requested, include that value
      if (grade && insightsData.fmv[grade.toString()]) {
        fmvData.current = insightsData.fmv[grade.toString()];
      }
    }

    // Calculate trends if available
    const trend = insightsData.trend || null;
    const recentSales = insightsData.recent_sales || [];

    console.log(`Found FMV data for ${title} #${issue_number}:`, fmvData);

    return new Response(
      JSON.stringify({
        success: true,
        comic: {
          id: comicId,
          title: searchData.data[0].title,
          issue_number: searchData.data[0].issue_number,
          publisher: searchData.data[0].publisher,
          is_key: searchData.data[0].is_key || false,
          key_reason: searchData.data[0].key_reason || null,
        },
        fmv: fmvData,
        trend: trend,
        recent_sales: recentSales.slice(0, 5), // Limit to 5 recent sales
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('GoCollect value fetch error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch value from GoCollect';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
