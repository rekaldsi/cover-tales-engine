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

// Fetch with retry logic and timeout - returns null on failure instead of throwing
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 2,
  timeoutMs = 15000
): Promise<{ response: Response | null; error: string | null }> {
  let lastError: string = 'Unknown error';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Don't retry on client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return { response, error: null };
      }
      
      // Cloudflare timeout errors - don't retry, fail fast
      if (response.status === 522 || response.status === 524) {
        console.log(`GoCollect servers unreachable (${response.status})`);
        return { response: null, error: 'gocollect_unavailable' };
      }
      
      // Server error - will retry
      console.log(`Attempt ${attempt}/${maxRetries} failed with status ${response.status}`);
      lastError = `Server error ${response.status}`;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Attempt ${attempt}/${maxRetries} timed out after ${timeoutMs}ms`);
        lastError = 'Request timed out';
      } else {
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, error);
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Quick backoff: 1s, 2s
    if (attempt < maxRetries) {
      const delay = attempt * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { response: null, error: lastError };
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
    const searchResult = await fetchWithRetry(
      `https://api.gocollect.com/v1/search?${searchParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${GOCOLLECT_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    // Handle GoCollect unavailability gracefully
    if (searchResult.error || !searchResult.response) {
      console.log('GoCollect unavailable, signaling fallback needed');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'gocollect_unavailable',
          message: 'GoCollect servers are temporarily unavailable',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503, // Service Unavailable - clearer for client to handle
        }
      );
    }

    const searchResponse = searchResult.response;

    if (!searchResponse.ok) {
      console.error(`GoCollect search error: ${searchResponse.status}`);
      
      if (searchResponse.status === 401 || searchResponse.status === 403) {
        throw new Error('GoCollect API authentication failed. Please check your API key.');
      }
      
      throw new Error('Failed to search GoCollect');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'not_found',
          message: 'Comic not found in GoCollect database',
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
    const insightsResult = await fetchWithRetry(
      `https://api.gocollect.com/v1/insights/${comicId}`,
      {
        headers: {
          'Authorization': `Bearer ${GOCOLLECT_API_KEY}`,
          'Accept': 'application/json',
        },
      }
    );

    if (insightsResult.error || !insightsResult.response) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'gocollect_unavailable',
          message: 'GoCollect servers are temporarily unavailable',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    const insightsResponse = insightsResult.response;

    if (!insightsResponse.ok) {
      console.error(`GoCollect insights error: ${insightsResponse.status}`);
      
      if (insightsResponse.status === 401 || insightsResponse.status === 403) {
        throw new Error('GoCollect API authentication failed. Please check your API key.');
      }
      
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
        recent_sales: recentSales.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('GoCollect value fetch error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to fetch value from GoCollect',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
