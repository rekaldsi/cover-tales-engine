import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const METRON_API_URL = 'https://metron.cloud/api';

interface MetronSearchResult {
  success: boolean;
  source: 'metron';
  results: Array<{
    id: number;
    title: string;
    issueNumber: string;
    publisher: string;
    coverDate?: string;
    coverImageUrl?: string;
    upc?: string;
    comicvineId?: string;
    variants?: Array<{
      name: string;
      imageUrl: string;
    }>;
  }>;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, upc } = await req.json();

    const METRON_USERNAME = Deno.env.get('METRON_USERNAME');
    const METRON_PASSWORD = Deno.env.get('METRON_PASSWORD');

    if (!METRON_USERNAME || !METRON_PASSWORD) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          source: 'metron',
          results: [],
          error: 'Metron API not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Basic auth header
    const credentials = btoa(`${METRON_USERNAME}:${METRON_PASSWORD}`);
    const authHeaders = {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'KODEX/1.0',
      'Accept': 'application/json',
    };

    // Search by UPC if provided (most accurate)
    if (upc) {
      console.log('Metron: Searching by UPC:', upc);
      
      const upcUrl = new URL(`${METRON_API_URL}/issue/`);
      upcUrl.searchParams.set('upc', upc);

      const upcResponse = await fetch(upcUrl.toString(), { headers: authHeaders });
      
      if (upcResponse.ok) {
        const upcData = await upcResponse.json();
        if (upcData.results && upcData.results.length > 0) {
          const results = upcData.results.map((issue: any) => ({
            id: issue.id,
            title: issue.series?.name || issue.issue_name || '',
            issueNumber: issue.number?.toString() || '',
            publisher: issue.publisher?.name || '',
            coverDate: issue.cover_date,
            coverImageUrl: issue.image,
            upc: issue.upc,
            comicvineId: issue.cv_id?.toString(),
          }));

          return new Response(
            JSON.stringify({ success: true, source: 'metron', results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Search by title + issue number
    if (title) {
      console.log('Metron: Searching by title:', title, issueNumber);

      // First search for series
      const seriesUrl = new URL(`${METRON_API_URL}/series/`);
      seriesUrl.searchParams.set('name', title);
      if (publisher) {
        seriesUrl.searchParams.set('publisher_name', publisher);
      }

      const seriesResponse = await fetch(seriesUrl.toString(), { headers: authHeaders });
      
      if (!seriesResponse.ok) {
        console.error('Metron series search failed:', seriesResponse.status);
        throw new Error('Metron API request failed');
      }

      const seriesData = await seriesResponse.json();
      const series = seriesData.results || [];

      if (series.length === 0) {
        return new Response(
          JSON.stringify({ success: true, source: 'metron', results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find best matching series
      const matchedSeries = series[0];
      console.log('Metron: Found series:', matchedSeries.name, 'ID:', matchedSeries.id);

      // Search for specific issue in series
      const issueUrl = new URL(`${METRON_API_URL}/issue/`);
      issueUrl.searchParams.set('series_id', matchedSeries.id.toString());
      if (issueNumber) {
        issueUrl.searchParams.set('number', issueNumber.toString().replace(/^#/, ''));
      }

      const issueResponse = await fetch(issueUrl.toString(), { headers: authHeaders });
      
      if (!issueResponse.ok) {
        console.error('Metron issue search failed:', issueResponse.status);
        throw new Error('Metron issue search failed');
      }

      const issueData = await issueResponse.json();
      const issues = issueData.results || [];

      const results = issues.map((issue: any) => ({
        id: issue.id,
        title: matchedSeries.name,
        issueNumber: issue.number?.toString() || '',
        publisher: issue.publisher?.name || matchedSeries.publisher?.name || '',
        coverDate: issue.cover_date,
        coverImageUrl: issue.image,
        upc: issue.upc,
        comicvineId: issue.cv_id?.toString(),
        variants: issue.variants?.map((v: any) => ({
          name: v.name || 'Variant',
          imageUrl: v.image,
        })),
      }));

      console.log(`Metron: Found ${results.length} issues`);

      return new Response(
        JSON.stringify({ success: true, source: 'metron', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, source: 'metron', results: [], error: 'No search criteria provided' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Metron search error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        source: 'metron',
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
