import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';

async function fetchComicVineCover(title: string, issueNumber: string, publisher: string, apiKey: string) {
  try {
    console.log('Fetching ComicVine data for:', { title, issueNumber, publisher });

    // Search for the volume
    const volumeSearchUrl = new URL(`${COMICVINE_API}/search/`);
    volumeSearchUrl.searchParams.set('api_key', apiKey);
    volumeSearchUrl.searchParams.set('format', 'json');
    volumeSearchUrl.searchParams.set('resources', 'volume');
    volumeSearchUrl.searchParams.set('query', title);
    volumeSearchUrl.searchParams.set('limit', '5');

    const volumeResponse = await fetch(volumeSearchUrl.toString(), {
      headers: { 'User-Agent': 'ComicVault/1.0' }
    });

    if (!volumeResponse.ok) {
      console.error('ComicVine volume search failed:', volumeResponse.status);
      return null;
    }

    const volumeData = await volumeResponse.json();
    const volumes = volumeData.results || [];

    if (volumes.length === 0) {
      console.log('No ComicVine volumes found');
      return null;
    }

    // Find best matching volume (prefer publisher match)
    let matchedVolume = volumes[0];
    if (publisher) {
      const publisherLower = publisher.toLowerCase();
      const publisherMatch = volumes.find((v: any) => 
        v.publisher?.name?.toLowerCase().includes(publisherLower) ||
        publisherLower.includes(v.publisher?.name?.toLowerCase() || '')
      );
      if (publisherMatch) matchedVolume = publisherMatch;
    }

    // Fetch issues from volume
    const issuesUrl = new URL(`${COMICVINE_API}/issues/`);
    issuesUrl.searchParams.set('api_key', apiKey);
    issuesUrl.searchParams.set('format', 'json');
    issuesUrl.searchParams.set('filter', `volume:${matchedVolume.id}`);
    issuesUrl.searchParams.set('limit', '100');

    const issuesResponse = await fetch(issuesUrl.toString(), {
      headers: { 'User-Agent': 'ComicVault/1.0' }
    });

    if (!issuesResponse.ok) {
      console.error('ComicVine issues fetch failed');
      return null;
    }

    const issuesData = await issuesResponse.json();
    const issues = issuesData.results || [];

    // Find matching issue
    const cleanIssueNum = issueNumber?.toString().replace(/^#/, '').trim() || '1';
    const matchedIssue = issues.find((i: any) => 
      i.issue_number === cleanIssueNum ||
      parseInt(i.issue_number) === parseInt(cleanIssueNum)
    ) || issues[0];

    if (!matchedIssue) return null;

    return {
      comicvineId: matchedIssue.id.toString(),
      title: matchedVolume.name,
      coverImageUrl: matchedIssue.image?.original_url || matchedIssue.image?.medium_url,
      coverDate: matchedIssue.cover_date,
      publisher: matchedVolume.publisher?.name,
    };
  } catch (error) {
    console.error('ComicVine fetch error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recognizing comic cover with AI...');

    // Step 1: Use AI to identify the comic from the image
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert comic book identifier. Analyze comic book covers and return structured JSON data.

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.

For comic covers, identify:
- title: The series title (e.g., "Amazing Spider-Man", "Batman")
- issueNumber: The issue number as a string
- publisher: The publisher (Marvel Comics, DC Comics, Image Comics, etc.)
- variant: Variant type if applicable (e.g., "Cover A", "1:25 Variant", "Newsstand", "Direct Edition")
- printNumber: Print number (1 for first print, 2 for second, etc.)
- isGraded: Whether this appears to be in a grading slab (CGC, CBCS, PGX)
- gradingCompany: If graded, which company (cgc, cbcs, pgx)
- grade: If visible, the numeric grade
- certNumber: If visible, the certification number
- coverDate: Estimated cover date in YYYY-MM format if visible
- isKeyIssue: Whether this is likely a key issue
- keyIssueReason: If key issue, why (first appearance, death, etc.)
- confidence: Your confidence level (high, medium, low)

JSON schema:
{
  "title": string,
  "issueNumber": string,
  "publisher": string,
  "variant": string | null,
  "printNumber": number,
  "isGraded": boolean,
  "gradingCompany": "cgc" | "cbcs" | "pgx" | null,
  "grade": string | null,
  "certNumber": string | null,
  "coverDate": string | null,
  "isKeyIssue": boolean,
  "keyIssueReason": string | null,
  "confidence": "high" | "medium" | "low"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify this comic book cover. Return ONLY valid JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service quota exceeded. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the AI response
    let comicData;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      comicData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse comic data', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI identified:', comicData.title, '#' + comicData.issueNumber);

    // Step 2: Fetch official cover from ComicVine (if API key is configured)
    if (COMICVINE_API_KEY && comicData.title) {
      console.log('Fetching official cover from ComicVine...');
      const comicVineData = await fetchComicVineCover(
        comicData.title,
        comicData.issueNumber,
        comicData.publisher,
        COMICVINE_API_KEY
      );

      if (comicVineData) {
        console.log('ComicVine match found:', comicVineData.coverImageUrl ? 'with cover' : 'no cover');
        // Merge ComicVine data with AI data (ComicVine takes priority for official data)
        comicData = {
          ...comicData,
          comicvineId: comicVineData.comicvineId,
          coverImageUrl: comicVineData.coverImageUrl, // Official cover URL
          title: comicVineData.title || comicData.title,
          coverDate: comicVineData.coverDate || comicData.coverDate,
          publisher: comicVineData.publisher || comicData.publisher,
        };
      } else {
        console.log('No ComicVine match, using AI data only');
      }
    } else {
      console.log('ComicVine API key not configured, using AI data only');
    }

    return new Response(
      JSON.stringify({ success: true, comic: comicData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error recognizing comic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
