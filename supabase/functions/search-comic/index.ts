import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ComicVine API - requires user's API key or we use a fallback search
const COMICVINE_API = 'https://comicvine.gamespot.com/api';

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

    // Use Lovable AI to search and provide comic metadata
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = barcode 
      ? `Find comic book information for UPC barcode: ${barcode}`
      : `Find comic book information for: ${title}${issueNumber ? ' #' + issueNumber : ''}${publisher ? ' by ' + publisher : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a comic book database expert. Given a search query, provide accurate comic book metadata.

Return ONLY valid JSON with this structure:
{
  "results": [
    {
      "title": "Series Title",
      "issueNumber": "1",
      "volume": 1,
      "publisher": "Publisher Name",
      "coverDate": "YYYY-MM-DD",
      "writer": "Writer Name",
      "artist": "Artist Name",
      "coverArtist": "Cover Artist Name",
      "description": "Brief description",
      "coverImageUrl": "URL to official cover image if known, otherwise null",
      "isKeyIssue": true/false,
      "keyIssueReason": "Reason if key issue",
      "variants": ["List of known variants"]
    }
  ],
  "confidence": "high" | "medium" | "low"
}

For cover images, use known CDN URLs like:
- Marvel: https://i.annihil.us/u/prod/marvel/i/mg/...
- DC: https://images-na.ssl-images-amazon.com/...
- Or set to null if unknown

Provide up to 5 matching results, sorted by relevance.`
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No search results' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let searchResults;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      searchResults = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse search results:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found', searchResults.results?.length || 0, 'results');

    return new Response(
      JSON.stringify({ success: true, ...searchResults }),
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
