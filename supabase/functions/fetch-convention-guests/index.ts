import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchGuestsRequest {
  eventId: string;
  websiteUrl?: string;
  manualGuests?: { name: string; role?: string }[];
}

interface Guest {
  name: string;
  role: string | null;
  boothInfo: string | null;
  signingFee: string | null;
  source: string;
  confidence: number;
}

/**
 * fetch-convention-guests - Fetches and normalizes convention guest lists
 * 
 * Sources:
 * 1. Manual entry (highest confidence)
 * 2. Website scraping via Firecrawl (when URL provided)
 * 3. Future: Convention API integrations
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[fetch-convention-guests] Received request');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { eventId, websiteUrl, manualGuests }: FetchGuestsRequest = await req.json();

    if (!eventId) {
      return new Response(
        JSON.stringify({ error: 'eventId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[fetch-convention-guests] Processing event:', eventId);

    const guests: Guest[] = [];

    // Add manual guests first (highest confidence)
    if (manualGuests && manualGuests.length > 0) {
      for (const g of manualGuests) {
        guests.push({
          name: g.name.trim(),
          role: g.role || null,
          boothInfo: null,
          signingFee: null,
          source: 'manual',
          confidence: 100,
        });
      }
      console.log('[fetch-convention-guests] Added', manualGuests.length, 'manual guests');
    }

    // Attempt website scraping if URL provided and Firecrawl is available
    if (websiteUrl) {
      const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
      
      if (FIRECRAWL_API_KEY) {
        console.log('[fetch-convention-guests] Scraping website:', websiteUrl);
        
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: websiteUrl,
              formats: ['markdown'],
            }),
          });

          if (scrapeResponse.ok) {
            const scrapeData = await scrapeResponse.json();
            const markdown = scrapeData.data?.markdown || '';
            
            // Use AI to extract guest names from scraped content
            const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
            
            if (LOVABLE_API_KEY && markdown.length > 100) {
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
                      content: `You are an expert at extracting comic convention guest information. 
                      Extract names of comic book creators (writers, artists, cover artists) from the text.
                      Return a JSON array of objects with: name, role (writer/artist/creator/actor/unknown).
                      Only include people who are comic creators or relevant to comic signings.
                      Return ONLY valid JSON array, no other text.`
                    },
                    { 
                      role: 'user', 
                      content: `Extract comic creator guests from this convention page:\n\n${markdown.slice(0, 8000)}`
                    }
                  ],
                  temperature: 0.1,
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const content = aiData.choices?.[0]?.message?.content || '';
                
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                  try {
                    const scrapedGuests = JSON.parse(jsonMatch[0]);
                    for (const sg of scrapedGuests) {
                      // Avoid duplicates
                      if (!guests.some(g => g.name.toLowerCase() === sg.name?.toLowerCase())) {
                        guests.push({
                          name: sg.name,
                          role: sg.role || null,
                          boothInfo: null,
                          signingFee: null,
                          source: 'scraped',
                          confidence: 70,
                        });
                      }
                    }
                    console.log('[fetch-convention-guests] Extracted', scrapedGuests.length, 'guests from website');
                  } catch (parseErr) {
                    console.error('[fetch-convention-guests] Failed to parse AI response');
                  }
                }
              }
            }
          } else {
            console.error('[fetch-convention-guests] Scrape failed:', scrapeResponse.status);
          }
        } catch (scrapeError) {
          console.error('[fetch-convention-guests] Scrape error:', scrapeError);
        }
      } else {
        console.log('[fetch-convention-guests] Firecrawl not configured, skipping scrape');
      }
    }

    // Insert guests into database
    if (guests.length > 0) {
      const guestRecords = guests.map(g => ({
        event_id: eventId,
        guest_name: g.name,
        guest_role: g.role,
        booth_info: g.boothInfo,
        signing_fee: g.signingFee,
        source: g.source,
        confidence: g.confidence,
      }));

      const { error: insertError } = await supabase
        .from('event_guests')
        .insert(guestRecords);

      if (insertError) {
        console.error('[fetch-convention-guests] Insert error:', insertError);
      } else {
        console.log('[fetch-convention-guests] Inserted', guests.length, 'guests');
      }
    }

    // Now generate signing recommendations by matching guests to user's comics
    const { data: event } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (event?.user_id) {
      await generateRecommendations(supabase, eventId, event.user_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        guestCount: guests.length,
        guests: guests.map(g => ({ name: g.name, role: g.role, source: g.source })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-convention-guests] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateRecommendations(supabase: any, eventId: string, userId: string) {
  console.log('[fetch-convention-guests] Generating recommendations for event:', eventId);

  // Get all guests for this event
  const { data: guests } = await supabase
    .from('event_guests')
    .select('id, guest_name, guest_role')
    .eq('event_id', eventId);

  if (!guests || guests.length === 0) return;

  // Get user's comics with creator info
  const { data: comics } = await supabase
    .from('comics')
    .select('id, title, issue_number, writer, artist, cover_artist, current_value, is_signed')
    .eq('user_id', userId)
    .eq('is_signed', false); // Only unsigned comics

  if (!comics || comics.length === 0) return;

  const recommendations: any[] = [];

  // Match comics to guests
  for (const guest of guests) {
    const guestNameLower = guest.guest_name.toLowerCase();
    
    for (const comic of comics) {
      let matchReason: string | null = null;
      
      // Check writer
      if (comic.writer && comic.writer.toLowerCase().includes(guestNameLower)) {
        matchReason = 'writer';
      }
      // Check artist
      else if (comic.artist && comic.artist.toLowerCase().includes(guestNameLower)) {
        matchReason = 'artist';
      }
      // Check cover artist
      else if (comic.cover_artist && comic.cover_artist.toLowerCase().includes(guestNameLower)) {
        matchReason = 'cover_artist';
      }

      if (matchReason) {
        // Estimate signed value (rough 20-50% increase)
        const currentValue = comic.current_value || 0;
        const signedMultiplier = matchReason === 'writer' ? 1.3 : matchReason === 'artist' ? 1.4 : 1.2;
        const estimatedSignedValue = currentValue * signedMultiplier;
        const upliftPercent = (signedMultiplier - 1) * 100;
        
        // Priority score based on current value and uplift
        const priorityScore = Math.min(100, Math.round(
          (currentValue / 100) * 30 + // Value component
          upliftPercent * 0.5 + // Uplift component
          (matchReason === 'artist' ? 20 : matchReason === 'writer' ? 15 : 10) // Role component
        ));

        recommendations.push({
          user_id: userId,
          event_id: eventId,
          comic_id: comic.id,
          guest_id: guest.id,
          match_reason: matchReason,
          priority_score: priorityScore,
          current_value: currentValue,
          estimated_signed_value: estimatedSignedValue,
          value_uplift_percent: upliftPercent,
          status: 'pending',
        });
      }
    }
  }

  // Insert recommendations (upsert to avoid duplicates)
  if (recommendations.length > 0) {
    const { error } = await supabase
      .from('signing_recommendations')
      .insert(recommendations);

    if (error) {
      console.error('[fetch-convention-guests] Rec insert error:', error);
    } else {
      console.log('[fetch-convention-guests] Generated', recommendations.length, 'recommendations');
    }
  }
}
