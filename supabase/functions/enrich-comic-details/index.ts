import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, existingSynopsis } = await req.json();

    if (!title || !issueNumber) {
      return new Response(
        JSON.stringify({ error: 'Title and issue number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we already have a synopsis, no need to generate
    if (existingSynopsis && existingSynopsis.length > 100) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synopsis: existingSynopsis,
          source: 'existing'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating synopsis for ${title} #${issueNumber}...`);

    // Use AI to generate a synopsis if we don't have one
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
            content: `You are a comic book expert. Generate a brief, accurate synopsis for comic book issues. Keep it factual and concise (2-3 sentences). If this is a well-known issue, include key plot points. If you're not certain about the specific issue, provide a general description based on the series. Do NOT make up specific plot details if you're unsure.`
          },
          {
            role: 'user',
            content: `Generate a brief synopsis for: ${title} #${issueNumber}${publisher ? ` (${publisher})` : ''}. 
            
If this is a notable or key issue, mention why it's significant (first appearances, major events, etc.).
Keep the response to 2-3 sentences maximum.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI synopsis generation failed:', aiResponse.status);
      return new Response(
        JSON.stringify({ 
          success: true, 
          synopsis: null,
          source: 'unavailable'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const synopsis = aiData.choices?.[0]?.message?.content?.trim() || null;

    console.log('Generated synopsis:', synopsis?.substring(0, 100) + '...');

    return new Response(
      JSON.stringify({ 
        success: true, 
        synopsis,
        source: 'ai_generated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error enriching comic details:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
