import { generateRequestId, logProvider } from '../_shared/integration-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GCD_API = 'https://www.comics.org/api';

interface GCDCredit {
  name: string;
  role: 'writer' | 'artist' | 'cover_artist' | 'inker' | 'colorist' | 'letterer' | 'editor';
  source: 'gcd';
  confidence: number;
}

interface GCDResult {
  success: boolean;
  credits: GCDCredit[];
  synopsis?: string;
  coverDate?: string;
  pageCount?: number;
  error?: string;
}

// Normalize GCD role names to our standard format
function normalizeGCDRole(role: string): GCDCredit['role'] | null {
  const r = role.toLowerCase();
  if (r.includes('script') || r.includes('writer') || r.includes('plot')) return 'writer';
  if (r.includes('cover') && (r.includes('pencil') || r.includes('paint') || r.includes('art'))) return 'cover_artist';
  if (r.includes('pencil') || (r.includes('art') && !r.includes('cover'))) return 'artist';
  if (r.includes('ink')) return 'inker';
  if (r.includes('color')) return 'colorist';
  if (r.includes('letter')) return 'letterer';
  if (r.includes('edit')) return 'editor';
  return null;
}

// Search GCD for a comic series
async function searchGCDSeries(
  title: string,
  publisher?: string,
  requestId?: string
): Promise<{ id: number; name: string } | null> {
  try {
    const params = new URLSearchParams({
      name: title,
      format: 'json',
    });
    if (publisher) {
      params.set('publisher_name', publisher);
    }

    const url = `${GCD_API}/series/?${params.toString()}`;
    console.log(`[${requestId}] GCD series search:`, url);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error(`[${requestId}] GCD series search failed:`, response.status);
      return null;
    }

    const data = await response.json();
    const results = data.results || data;

    if (Array.isArray(results) && results.length > 0) {
      // Find best match - prefer exact title match
      const exactMatch = results.find((s: any) => 
        s.name.toLowerCase() === title.toLowerCase()
      );
      return exactMatch || results[0];
    }

    return null;
  } catch (error) {
    console.error(`[${requestId}] GCD series search error:`, error);
    return null;
  }
}

// Get issue details from GCD
async function getGCDIssue(
  seriesId: number,
  issueNumber: string,
  requestId?: string
): Promise<any | null> {
  try {
    const params = new URLSearchParams({
      series: seriesId.toString(),
      number: issueNumber.replace(/^#/, ''),
      format: 'json',
    });

    const url = `${GCD_API}/issue/?${params.toString()}`;
    console.log(`[${requestId}] GCD issue search:`, url);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error(`[${requestId}] GCD issue search failed:`, response.status);
      return null;
    }

    const data = await response.json();
    const results = data.results || data;

    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }

    return null;
  } catch (error) {
    console.error(`[${requestId}] GCD issue search error:`, error);
    return null;
  }
}

// Get credits from GCD story data
async function getGCDCredits(
  issueId: number,
  requestId?: string
): Promise<GCDCredit[]> {
  try {
    const url = `${GCD_API}/issue/${issueId}/story/?format=json`;
    console.log(`[${requestId}] GCD story fetch:`, url);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error(`[${requestId}] GCD story fetch failed:`, response.status);
      return [];
    }

    const data = await response.json();
    const stories = data.results || data || [];

    const credits: GCDCredit[] = [];
    const seenRoles = new Set<string>();

    for (const story of stories) {
      // Parse credit fields - GCD stores credits as semicolon-separated strings
      const creditFields = [
        { field: 'script', role: 'writer' },
        { field: 'pencils', role: 'artist' },
        { field: 'inks', role: 'inker' },
        { field: 'colors', role: 'colorist' },
        { field: 'letters', role: 'letterer' },
        { field: 'editing', role: 'editor' },
      ];

      for (const { field, role } of creditFields) {
        const value = story[field];
        if (value && typeof value === 'string' && value.trim()) {
          // Split by semicolon or comma
          const names = value.split(/[;,]/).map((n: string) => n.trim()).filter((n: string) => n && n !== '?');
          
          for (const name of names) {
            // Skip placeholder values
            if (name.toLowerCase().includes('unknown') || name === '?' || name.length < 2) continue;
            
            const key = `${name}-${role}`;
            if (!seenRoles.has(key)) {
              seenRoles.add(key);
              credits.push({
                name,
                role: role as GCDCredit['role'],
                source: 'gcd',
                confidence: 85,
              });
            }
          }
        }
      }
    }

    return credits;
  } catch (error) {
    console.error(`[${requestId}] GCD credits fetch error:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const { title, issue_number, publisher } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] GCD lookup for: ${title} #${issue_number}`);

    // Step 1: Find the series
    const series = await searchGCDSeries(title, publisher, requestId);
    
    if (!series) {
      console.log(`[${requestId}] No series found for: ${title}`);
      await logProvider(
        { requestId, function: 'fetch-gcd-data', provider: 'gcd' },
        { status: 'partial', latencyMs: Date.now() - startTime, errorCode: 'NO_SERIES', errorMessage: 'Series not found' }
      );
      return new Response(
        JSON.stringify({ success: false, credits: [], error: 'Series not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Found series:`, series.name, series.id);

    // Step 2: Find the issue
    const issue = await getGCDIssue(series.id, issue_number || '1', requestId);
    
    if (!issue) {
      console.log(`[${requestId}] No issue found for: ${title} #${issue_number}`);
      await logProvider(
        { requestId, function: 'fetch-gcd-data', provider: 'gcd' },
        { status: 'partial', latencyMs: Date.now() - startTime, errorCode: 'NO_ISSUE', errorMessage: 'Issue not found' }
      );
      return new Response(
        JSON.stringify({ success: false, credits: [], error: 'Issue not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Found issue ID:`, issue.id);

    // Step 3: Get credits from stories
    const credits = await getGCDCredits(issue.id, requestId);

    const latencyMs = Date.now() - startTime;
    console.log(`[${requestId}] GCD returned ${credits.length} credits in ${latencyMs}ms`);

    await logProvider(
      { 
        requestId, 
        function: 'fetch-gcd-data', 
        provider: 'gcd',
        outputsSummary: { creditsFound: credits.length }
      },
      { status: credits.length > 0 ? 'ok' : 'partial', latencyMs }
    );

    const result: GCDResult = {
      success: true,
      credits,
      coverDate: issue.publication_date || issue.cover_date,
      pageCount: issue.page_count,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`[${requestId}] GCD fetch error:`, error);
    
    await logProvider(
      { requestId, function: 'fetch-gcd-data', provider: 'gcd' },
      { status: 'error', latencyMs, errorCode: 'EXCEPTION', errorMessage: String(error) }
    );

    return new Response(
      JSON.stringify({ 
        success: false, 
        credits: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
