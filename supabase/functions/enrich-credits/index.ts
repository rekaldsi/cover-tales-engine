import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateRequestId, logProvider } from '../_shared/integration-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';
const METRON_API = 'https://metron.cloud/api';

interface CreatorCredit {
  name: string;
  role: 'writer' | 'artist' | 'cover_artist' | 'inker' | 'colorist' | 'letterer' | 'editor';
  source: 'comicvine' | 'metron' | 'manual';
  confidence: number;
}

interface ComicForEnrichment {
  id: string;
  title: string;
  issue_number: string;
  publisher: string | null;
  comicvine_id: string | null;
  writer: string | null;
  artist: string | null;
  cover_artist: string | null;
  credits_source: string | null;
  user_id: string;
}

// Parse role string into normalized role
function normalizeRole(roleStr: string): CreatorCredit['role'] | null {
  const role = roleStr.toLowerCase();
  if (role.includes('writer') || role.includes('script')) return 'writer';
  if (role.includes('cover') && (role.includes('artist') || role.includes('paint'))) return 'cover_artist';
  if (role.includes('pencil') || (role.includes('artist') && !role.includes('cover'))) return 'artist';
  if (role.includes('inker') || role.includes('inks')) return 'inker';
  if (role.includes('color')) return 'colorist';
  if (role.includes('letter')) return 'letterer';
  if (role.includes('editor')) return 'editor';
  return null;
}

// Fetch credits from ComicVine single issue detail endpoint (thick fetch)
async function fetchComicVineCredits(
  comicvineId: string,
  apiKey: string,
  requestId: string
): Promise<{ credits: CreatorCredit[]; description?: string } | null> {
  const startTime = Date.now();
  
  try {
    // Use single issue detail endpoint for full credits
    const url = new URL(`${COMICVINE_API}/issue/4000-${comicvineId}/`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('field_list', 'person_credits,description,name');

    console.log(`[${requestId}] Fetching ComicVine issue detail for ID:`, comicvineId);
    
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[${requestId}] ComicVine detail fetch failed:`, response.status);
      await logProvider(
        { requestId, function: 'enrich-credits', provider: 'comicvine', httpStatus: response.status },
        { status: 'error', latencyMs, errorCode: 'HTTP_ERROR', errorMessage: `Status ${response.status}` }
      );
      return null;
    }

    const data = await response.json();
    const issue = data.results;

    if (!issue) {
      await logProvider(
        { requestId, function: 'enrich-credits', provider: 'comicvine', httpStatus: response.status },
        { status: 'error', latencyMs, errorCode: 'NO_RESULTS', errorMessage: 'No issue found' }
      );
      return null;
    }

    const credits: CreatorCredit[] = [];
    const seenRoles = new Set<string>();

    if (issue.person_credits && Array.isArray(issue.person_credits)) {
      for (const credit of issue.person_credits) {
        const role = normalizeRole(credit.role || '');
        if (role && !seenRoles.has(`${credit.name}-${role}`)) {
          seenRoles.add(`${credit.name}-${role}`);
          credits.push({
            name: credit.name,
            role,
            source: 'comicvine',
            confidence: 100,
          });
        }
      }
    }

    // Strip HTML from description
    let description = issue.description || '';
    if (description) {
      description = description.replace(/<[^>]*>/g, '').substring(0, 1000);
    }

    console.log(`[${requestId}] ComicVine returned ${credits.length} credits`);

    await logProvider(
      { 
        requestId, 
        function: 'enrich-credits', 
        provider: 'comicvine', 
        httpStatus: response.status,
        outputsSummary: { creditsFound: credits.length, hasDescription: !!description }
      },
      { status: 'ok', latencyMs }
    );

    return { credits, description };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`[${requestId}] ComicVine credits fetch error:`, error);
    await logProvider(
      { requestId, function: 'enrich-credits', provider: 'comicvine' },
      { status: 'error', latencyMs, errorCode: 'EXCEPTION', errorMessage: String(error) }
    );
    return null;
  }
}

// Fetch credits from Metron as fallback
async function fetchMetronCredits(
  title: string,
  issueNumber: string,
  publisher: string | null,
  username: string,
  password: string,
  requestId: string
): Promise<CreatorCredit[] | null> {
  const startTime = Date.now();
  
  try {
    const credentials = btoa(`${username}:${password}`);
    const authHeaders = {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': 'KODEX/1.0',
      'Accept': 'application/json',
    };

    // Search for series
    const seriesUrl = new URL(`${METRON_API}/series/`);
    seriesUrl.searchParams.set('name', title);
    if (publisher) seriesUrl.searchParams.set('publisher_name', publisher);

    const seriesResponse = await fetch(seriesUrl.toString(), { headers: authHeaders });
    
    if (!seriesResponse.ok) {
      console.error(`[${requestId}] Metron series search failed:`, seriesResponse.status);
      return null;
    }

    const seriesData = await seriesResponse.json();
    const series = seriesData.results || [];
    
    if (series.length === 0) return null;

    // Get issue details with credits
    const issueUrl = new URL(`${METRON_API}/issue/`);
    issueUrl.searchParams.set('series_id', series[0].id.toString());
    issueUrl.searchParams.set('number', issueNumber.replace(/^#/, ''));

    const issueResponse = await fetch(issueUrl.toString(), { headers: authHeaders });
    
    if (!issueResponse.ok) return null;

    const issueData = await issueResponse.json();
    const issues = issueData.results || [];
    
    if (issues.length === 0) return null;

    // Get full issue details for credits
    const detailUrl = `${METRON_API}/issue/${issues[0].id}/`;
    const detailResponse = await fetch(detailUrl, { headers: authHeaders });
    
    if (!detailResponse.ok) return null;

    const detail = await detailResponse.json();
    const credits: CreatorCredit[] = [];
    const seenRoles = new Set<string>();

    // Metron uses different credit structure
    if (detail.credits && Array.isArray(detail.credits)) {
      for (const credit of detail.credits) {
        for (const roleItem of credit.role || []) {
          const role = normalizeRole(roleItem.name || '');
          if (role && !seenRoles.has(`${credit.creator.name}-${role}`)) {
            seenRoles.add(`${credit.creator.name}-${role}`);
            credits.push({
              name: credit.creator.name,
              role,
              source: 'metron',
              confidence: 90,
            });
          }
        }
      }
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[${requestId}] Metron returned ${credits.length} credits`);

    await logProvider(
      { requestId, function: 'enrich-credits', provider: 'metron', outputsSummary: { creditsFound: credits.length } },
      { status: credits.length > 0 ? 'ok' : 'partial', latencyMs }
    );

    return credits.length > 0 ? credits : null;
  } catch (error) {
    console.error(`[${requestId}] Metron credits fetch error:`, error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { comic_ids, limit = 10 } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const comicvineApiKey = Deno.env.get('COMICVINE_API_KEY');
    const metronUsername = Deno.env.get('METRON_USERNAME');
    const metronPassword = Deno.env.get('METRON_PASSWORD');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Enriching credits for user:`, user.id);

    // Get comics needing enrichment
    let query = supabase
      .from('comics')
      .select('id, title, issue_number, publisher, comicvine_id, writer, artist, cover_artist, credits_source, user_id')
      .eq('user_id', user.id)
      .or('credits_source.is.null,credits_source.eq.none')
      .limit(limit);

    if (comic_ids && Array.isArray(comic_ids) && comic_ids.length > 0) {
      query = supabase
        .from('comics')
        .select('id, title, issue_number, publisher, comicvine_id, writer, artist, cover_artist, credits_source, user_id')
        .eq('user_id', user.id)
        .in('id', comic_ids);
    }

    const { data: comics, error: fetchError } = await query;

    if (fetchError) {
      console.error(`[${requestId}] Failed to fetch comics:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch comics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!comics || comics.length === 0) {
      return new Response(
        JSON.stringify({ success: true, enriched: 0, message: 'No comics need enrichment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Found ${comics.length} comics to enrich`);

    let enriched = 0;
    let failed = 0;
    const results: { comicId: string; status: string; source?: string; creditsCount?: number }[] = [];

    for (const comic of comics as ComicForEnrichment[]) {
      // Rate limiting - 2 second delay between API calls
      if (enriched > 0 || failed > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      let credits: CreatorCredit[] = [];
      let creditsSource: 'comicvine' | 'metron' | 'mixed' | 'none' = 'none';
      let description: string | undefined;

      // Try ComicVine first (thick fetch with single issue detail)
      if (comic.comicvine_id && comicvineApiKey) {
        const cvResult = await fetchComicVineCredits(comic.comicvine_id, comicvineApiKey, requestId);
        if (cvResult && cvResult.credits.length > 0) {
          credits = cvResult.credits;
          creditsSource = 'comicvine';
          description = cvResult.description;
        }
      }

      // Fall back to Metron if no credits from ComicVine
      if (credits.length === 0 && metronUsername && metronPassword) {
        const metronCredits = await fetchMetronCredits(
          comic.title,
          comic.issue_number || '1',
          comic.publisher,
          metronUsername,
          metronPassword,
          requestId
        );
        if (metronCredits && metronCredits.length > 0) {
          credits = metronCredits;
          creditsSource = 'metron';
        }
      }

      if (credits.length === 0) {
        failed++;
        results.push({ comicId: comic.id, status: 'no_credits_found' });
        continue;
      }

      // Insert credits into comic_creators table
      const creatorRows = credits.map(c => ({
        comic_id: comic.id,
        name: c.name,
        role: c.role,
        source: c.source,
        confidence: c.confidence,
      }));

      // Delete existing credits for this comic first
      await supabase.from('comic_creators').delete().eq('comic_id', comic.id);

      const { error: insertError } = await supabase.from('comic_creators').insert(creatorRows);

      if (insertError) {
        console.error(`[${requestId}] Failed to insert credits for ${comic.id}:`, insertError);
        failed++;
        results.push({ comicId: comic.id, status: 'insert_failed' });
        continue;
      }

      // Update comic record with primary creators and source
      const writer = credits.find(c => c.role === 'writer')?.name || comic.writer;
      const artist = credits.find(c => c.role === 'artist')?.name || comic.artist;
      const coverArtist = credits.find(c => c.role === 'cover_artist')?.name || comic.cover_artist;
      const inker = credits.find(c => c.role === 'inker')?.name;
      const colorist = credits.find(c => c.role === 'colorist')?.name;
      const letterer = credits.find(c => c.role === 'letterer')?.name;
      const editor = credits.find(c => c.role === 'editor')?.name;

      const updateData: Record<string, any> = {
        credits_source: creditsSource,
        writer,
        artist,
        cover_artist: coverArtist,
      };

      if (inker) updateData.inker = inker;
      if (colorist) updateData.colorist = colorist;
      if (letterer) updateData.letterer = letterer;
      if (editor) updateData.editor = editor;
      if (description) updateData.synopsis = description;

      const { error: updateError } = await supabase
        .from('comics')
        .update(updateData)
        .eq('id', comic.id);

      if (updateError) {
        console.error(`[${requestId}] Failed to update comic ${comic.id}:`, updateError);
      }

      enriched++;
      results.push({ 
        comicId: comic.id, 
        status: 'enriched', 
        source: creditsSource, 
        creditsCount: credits.length 
      });

      console.log(`[${requestId}] Enriched ${comic.title} #${comic.issue_number}: ${credits.length} credits from ${creditsSource}`);
    }

    console.log(`[${requestId}] Enrichment complete: ${enriched} enriched, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        enriched,
        failed,
        total: comics.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`[${requestId}] Enrich credits error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
