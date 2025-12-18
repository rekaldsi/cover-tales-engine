import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';

interface SearchResult {
  title: string;
  issueNumber: string;
  volume?: number;
  publisher: string;
  coverDate?: string;
  writer?: string;
  artist?: string;
  coverArtist?: string;
  description?: string;
  coverImageUrl?: string;
  comicvineId?: string;
  isKeyIssue?: boolean;
  keyIssueReason?: string;
}

async function searchComicVine(
  title: string,
  issueNumber?: string,
  publisher?: string,
  apiKey?: string
): Promise<SearchResult[]> {
  if (!apiKey) return [];

  try {
    console.log('Searching ComicVine for:', { title, issueNumber, publisher });

    // Search for volumes matching the title
    const volumeSearchUrl = new URL(`${COMICVINE_API}/search/`);
    volumeSearchUrl.searchParams.set('api_key', apiKey);
    volumeSearchUrl.searchParams.set('format', 'json');
    volumeSearchUrl.searchParams.set('resources', 'volume');
    volumeSearchUrl.searchParams.set('query', title);
    volumeSearchUrl.searchParams.set('limit', '10');

    const volumeResponse = await fetch(volumeSearchUrl.toString(), {
      headers: { 'User-Agent': 'ComicVault/1.0' }
    });

    if (!volumeResponse.ok) {
      console.error('ComicVine search failed:', volumeResponse.status);
      return [];
    }

    const volumeData = await volumeResponse.json();
    const volumes = volumeData.results || [];

    if (volumes.length === 0) {
      console.log('No volumes found');
      return [];
    }

    // Filter by publisher if provided
    let filteredVolumes = volumes;
    if (publisher) {
      const publisherLower = publisher.toLowerCase();
      const publisherFiltered = volumes.filter((v: any) =>
        v.publisher?.name?.toLowerCase().includes(publisherLower) ||
        publisherLower.includes(v.publisher?.name?.toLowerCase() || '')
      );
      if (publisherFiltered.length > 0) {
        filteredVolumes = publisherFiltered;
      }
    }

    // Limit to top 5 volumes
    const topVolumes = filteredVolumes.slice(0, 5);
    const results: SearchResult[] = [];

    // For each volume, fetch the specific issue or first issue
    for (const volume of topVolumes) {
      try {
        const issuesUrl = new URL(`${COMICVINE_API}/issues/`);
        issuesUrl.searchParams.set('api_key', apiKey);
        issuesUrl.searchParams.set('format', 'json');
        issuesUrl.searchParams.set('filter', `volume:${volume.id}`);
        issuesUrl.searchParams.set('sort', 'issue_number:asc');
        issuesUrl.searchParams.set('limit', '50');

        const issuesResponse = await fetch(issuesUrl.toString(), {
          headers: { 'User-Agent': 'ComicVault/1.0' }
        });

        if (!issuesResponse.ok) continue;

        const issuesData = await issuesResponse.json();
        const issues = issuesData.results || [];

        if (issues.length === 0) continue;

        // Find matching issue or use first
        let matchedIssue = issues[0];
        if (issueNumber) {
          const cleanNum = issueNumber.toString().replace(/^#/, '').trim();
          const found = issues.find((i: any) =>
            i.issue_number === cleanNum ||
            parseInt(i.issue_number) === parseInt(cleanNum)
          );
          if (found) matchedIssue = found;
        }

        results.push({
          title: volume.name,
          issueNumber: matchedIssue.issue_number || '1',
          volume: volume.start_year ? parseInt(volume.start_year) : undefined,
          publisher: volume.publisher?.name || 'Unknown',
          coverDate: matchedIssue.cover_date,
          coverImageUrl: matchedIssue.image?.medium_url || matchedIssue.image?.original_url,
          comicvineId: matchedIssue.id?.toString(),
          description: matchedIssue.description?.replace(/<[^>]*>/g, '').slice(0, 200),
        });
      } catch (e) {
        console.error('Error fetching issues for volume:', volume.id, e);
      }
    }

    return results;
  } catch (error) {
    console.error('ComicVine search error:', error);
    return [];
  }
}

async function searchWithAI(
  query: string,
  lovableApiKey: string
): Promise<SearchResult[]> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a comic book database expert. Given a search query, provide accurate comic book metadata.

Return ONLY valid JSON with this structure:
{
  "results": [
    {
      "title": "Series Title",
      "issueNumber": "1",
      "publisher": "Publisher Name",
      "coverDate": "YYYY-MM-DD",
      "description": "Brief description",
      "isKeyIssue": true/false,
      "keyIssueReason": "Reason if key issue"
    }
  ]
}

Provide up to 5 matching results, sorted by relevance. Do NOT include coverImageUrl.`
          },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return parsed.results || [];
  } catch (e) {
    console.error('AI search error:', e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, barcode } = await req.json();

    if (!title && !barcode) {
      return new Response(
        JSON.stringify({ error: 'Title or barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for comic:', { title, issueNumber, publisher, barcode });

    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    let results: SearchResult[] = [];

    // Primary: Use ComicVine API
    if (COMICVINE_API_KEY && title) {
      results = await searchComicVine(title, issueNumber, publisher, COMICVINE_API_KEY);
      console.log('ComicVine returned', results.length, 'results');
    }

    // Fallback: Use AI if no ComicVine results or barcode search
    if (results.length === 0 && LOVABLE_API_KEY) {
      const searchQuery = barcode
        ? `Find comic book information for UPC barcode: ${barcode}`
        : `Find comic book information for: ${title}${issueNumber ? ' #' + issueNumber : ''}${publisher ? ' by ' + publisher : ''}`;
      
      results = await searchWithAI(searchQuery, LOVABLE_API_KEY);
      console.log('AI fallback returned', results.length, 'results');
    }

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No results found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, results, confidence: 'high' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
