import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';

interface ComicVineIssue {
  id: number;
  name: string | null;
  issue_number: string;
  cover_date: string | null;
  image: {
    original_url: string;
    medium_url: string;
    small_url: string;
  };
  volume: {
    id: number;
    name: string;
    api_detail_url: string;
  };
  person_credits?: Array<{
    name: string;
    role: string;
  }>;
  description?: string;
}

interface ComicVineVolume {
  id: number;
  name: string;
  publisher?: {
    id: number;
    name: string;
  };
  start_year?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    if (!COMICVINE_API_KEY) {
      console.error('COMICVINE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ComicVine API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching from ComicVine:', { title, issueNumber, publisher });

    // Step 1: Search for volumes (series) matching the title
    const volumeSearchUrl = new URL(`${COMICVINE_API}/search/`);
    volumeSearchUrl.searchParams.set('api_key', COMICVINE_API_KEY);
    volumeSearchUrl.searchParams.set('format', 'json');
    volumeSearchUrl.searchParams.set('resources', 'volume');
    volumeSearchUrl.searchParams.set('query', title);
    volumeSearchUrl.searchParams.set('limit', '10');

    console.log('Searching volumes...');
    const volumeResponse = await fetch(volumeSearchUrl.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
    });

    if (!volumeResponse.ok) {
      console.error('ComicVine volume search failed:', volumeResponse.status);
      return new Response(
        JSON.stringify({ error: 'ComicVine API error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const volumeData = await volumeResponse.json();
    const volumes: ComicVineVolume[] = volumeData.results || [];

    if (volumes.length === 0) {
      console.log('No volumes found for:', title);
      return new Response(
        JSON.stringify({ success: false, error: 'No matching series found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by publisher if provided
    let matchedVolume = volumes[0];
    if (publisher) {
      const publisherLower = publisher.toLowerCase();
      const publisherMatch = volumes.find(v => 
        v.publisher?.name?.toLowerCase().includes(publisherLower) ||
        publisherLower.includes(v.publisher?.name?.toLowerCase() || '')
      );
      if (publisherMatch) {
        matchedVolume = publisherMatch;
      }
    }

    console.log('Matched volume:', matchedVolume.name, 'ID:', matchedVolume.id);

    // Step 2: Get issues from the matched volume to find our specific issue
    const issuesUrl = new URL(`${COMICVINE_API}/issues/`);
    issuesUrl.searchParams.set('api_key', COMICVINE_API_KEY);
    issuesUrl.searchParams.set('format', 'json');
    issuesUrl.searchParams.set('filter', `volume:${matchedVolume.id}`);
    issuesUrl.searchParams.set('sort', 'issue_number:asc');
    issuesUrl.searchParams.set('limit', '100');

    console.log('Fetching issues for volume:', matchedVolume.id);
    const issuesResponse = await fetch(issuesUrl.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
    });

    if (!issuesResponse.ok) {
      console.error('ComicVine issues fetch failed:', issuesResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch issues' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const issuesData = await issuesResponse.json();
    const issues: ComicVineIssue[] = issuesData.results || [];

    // Find the matching issue number
    let matchedIssue: ComicVineIssue | null = null;
    if (issueNumber) {
      const cleanIssueNum = issueNumber.toString().replace(/^#/, '').trim();
      matchedIssue = issues.find(i => 
        i.issue_number === cleanIssueNum ||
        i.issue_number === `#${cleanIssueNum}` ||
        parseInt(i.issue_number) === parseInt(cleanIssueNum)
      ) || null;
    }

    // If no specific issue found, return the first issue as a sample
    if (!matchedIssue && issues.length > 0) {
      matchedIssue = issues[0];
    }

    if (!matchedIssue) {
      return new Response(
        JSON.stringify({ success: false, error: 'Issue not found in series' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract creator credits
    let writer = '';
    let artist = '';
    let coverArtist = '';
    
    if (matchedIssue.person_credits) {
      matchedIssue.person_credits.forEach(credit => {
        const role = credit.role.toLowerCase();
        if (role.includes('writer') && !writer) writer = credit.name;
        if ((role.includes('artist') || role.includes('pencil')) && !artist) artist = credit.name;
        if (role.includes('cover') && !coverArtist) coverArtist = credit.name;
      });
    }

    const result = {
      success: true,
      comicvineId: matchedIssue.id.toString(),
      title: matchedIssue.volume.name,
      issueNumber: matchedIssue.issue_number,
      publisher: matchedVolume.publisher?.name || publisher || 'Unknown',
      coverDate: matchedIssue.cover_date,
      coverImageUrl: matchedIssue.image?.original_url || matchedIssue.image?.medium_url,
      writer,
      artist,
      coverArtist,
      volumeId: matchedVolume.id,
      volumeStartYear: matchedVolume.start_year,
    };

    console.log('ComicVine result:', result.title, '#' + result.issueNumber, result.coverImageUrl ? 'with cover' : 'no cover');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('ComicVine fetch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
