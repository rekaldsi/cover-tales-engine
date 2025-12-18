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
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Recognizing comic cover...');

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response
    let comicData;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      comicData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse comic data', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Comic recognized:', comicData.title, '#' + comicData.issueNumber);

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
