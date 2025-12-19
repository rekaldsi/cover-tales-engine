import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';

async function fetchComicVineData(title: string, issueNumber: string, publisher: string, apiKey: string) {
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
      headers: { 'User-Agent': 'KODEX/1.0' }
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

    // Fetch issues from volume with full details
    const issuesUrl = new URL(`${COMICVINE_API}/issues/`);
    issuesUrl.searchParams.set('api_key', apiKey);
    issuesUrl.searchParams.set('format', 'json');
    issuesUrl.searchParams.set('filter', `volume:${matchedVolume.id}`);
    issuesUrl.searchParams.set('limit', '100');
    issuesUrl.searchParams.set('field_list', 'id,issue_number,name,cover_date,image,description,person_credits,character_credits,story_arc_credits');

    const issuesResponse = await fetch(issuesUrl.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
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

    // Fetch full issue details for credits
    const issueDetailUrl = new URL(`${COMICVINE_API}/issue/4000-${matchedIssue.id}/`);
    issueDetailUrl.searchParams.set('api_key', apiKey);
    issueDetailUrl.searchParams.set('format', 'json');
    issueDetailUrl.searchParams.set('field_list', 'id,name,description,person_credits,character_credits,story_arc_credits');

    let issueDetails = null;
    try {
      const detailResponse = await fetch(issueDetailUrl.toString(), {
        headers: { 'User-Agent': 'KODEX/1.0' }
      });
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        issueDetails = detailData.results;
      }
    } catch (e) {
      console.log('Could not fetch issue details:', e);
    }

    // Extract creators from credits
    const credits = issueDetails?.person_credits || matchedIssue.person_credits || [];
    const getCreatorByRole = (role: string) => 
      credits.find((c: any) => c.role?.toLowerCase().includes(role))?.name || null;

    // Extract characters
    const characters = (issueDetails?.character_credits || matchedIssue.character_credits || [])
      .slice(0, 10)
      .map((c: any) => c.name);

    // Extract story arc
    const storyArcs = issueDetails?.story_arc_credits || matchedIssue.story_arc_credits || [];
    const storyArc = storyArcs[0]?.name || null;

    // Clean description (remove HTML)
    let synopsis = issueDetails?.description || matchedIssue.description || null;
    if (synopsis) {
      synopsis = synopsis
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim()
        .substring(0, 1000);
    }

    return {
      comicvineId: matchedIssue.id.toString(),
      title: matchedVolume.name,
      coverImageUrl: matchedIssue.image?.original_url || matchedIssue.image?.medium_url,
      coverDate: matchedIssue.cover_date,
      publisher: matchedVolume.publisher?.name,
      synopsis,
      characters,
      storyArc,
      writer: getCreatorByRole('writer'),
      artist: getCreatorByRole('artist') || getCreatorByRole('penciler'),
      coverArtist: getCreatorByRole('cover'),
      colorist: getCreatorByRole('colorist'),
      inker: getCreatorByRole('inker'),
      letterer: getCreatorByRole('letterer'),
      editor: getCreatorByRole('editor'),
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

    console.log('Recognizing comic cover with AI (Gemini 2.5 Pro)...');

    // Step 1: Use AI to identify the comic from the image - UPGRADED TO GEMINI PRO
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert comic book identifier AND condition grader with deep knowledge of comics, professional grading standards (CGC, CBCS, PGX), and collectibles. Analyze comic book covers and return structured JSON data.

IMPORTANT: Return ONLY valid JSON, no markdown or explanation.

PUBLISHER DETECTION - This is CRITICAL:
- Look for publisher logos on the cover:
  - Marvel Comics: Red Marvel banner, corner box with character, "MARVEL" text
  - DC Comics: DC bullet logo (circular), "DC" text, Warner Bros connection
  - Image Comics: "i" logo, Image text at top
  - Dark Horse: Horse head logo, "Dark Horse" text
  - IDW: "IDW" letters in logo
  - Valiant: "V" logo, Valiant Entertainment
  - Boom Studios: "BOOM!" text
  - Dynamite: "DYNAMITE" text at top
- If you can't see a logo, infer from:
  - Character: Spider-Man, X-Men, Avengers = Marvel
  - Character: Batman, Superman, Wonder Woman, Flash = DC
  - Character: Spawn, Invincible, Savage Dragon = Image

BARCODE/UPC DETECTION:
- Look for UPC barcode on the cover (usually bottom left or right)
- Extract the full UPC number if visible (typically 12-14 digits)
- Also look for cover price (e.g., "$3.99", "$4.99")

CRITICAL INSTRUCTIONS FOR GRADED SLABS:
- If you see a comic in a plastic holder/slab, look for:
  - CGC: Blue label with "CGC" text, grade in large numbers, cert number at bottom
  - CBCS: Red/burgundy label with "CBCS" text
  - PGX: Gold/yellow label with "PGX" text
- Read the grade carefully (e.g., 9.8, 9.6, 9.4, 9.2, 9.0, 8.5, 8.0, etc.)
- The certification number is usually 10 digits on CGC labels
- Look for "Signature Series" or "SS" which indicates authenticated signatures

CONDITION ANALYSIS FOR RAW COMICS (not in slabs):
If this is a RAW comic (not graded/slabbed), carefully analyze visible condition defects:
- SPINE: Look for stress marks, spine ticks, spine roll, bindery tears
- CORNERS: Corner wear, blunted corners, corner creases
- EDGES: Edge wear, chipping, small tears
- COVER: Creases, folds, scratches, scuffs, staining, foxing
- COLORS: Fading, sun damage, yellowing
- STRUCTURAL: Missing pieces, large tears, water damage, mold

Based on visible defects, estimate a raw grade using CGC standards:
- 9.8: Near perfect, barely any defects
- 9.6: Minor defects, very minor spine stress
- 9.4: Light defects, minor spine wear
- 9.2: Light wear, some spine stress
- 9.0: Minor wear on cover and spine
- 8.0-8.5: Moderate wear, minor creases
- 7.0-7.5: Visible wear, some creasing
- 6.0-6.5: Above average wear, creases
- 5.0-5.5: Average wear (VG/FN)
- 4.0 and below: Heavy wear, major defects

KEY ISSUE DETECTION - Be specific about WHY it's a key issue:
- First appearances (e.g., "First appearance of Venom")
- Deaths of major characters
- Origin stories
- First issue of a series
- Significant storyline events
- Creator debuts

For comic covers, identify:
- title: The series title (e.g., "Amazing Spider-Man", "Batman", "Uncanny X-Men")
- issueNumber: The issue number as a string (look for "#" followed by number)
- publisher: The publisher (MUST identify: Marvel Comics, DC Comics, Image Comics, Dark Horse, IDW, Valiant, etc.)
- variant: Variant type if applicable (e.g., "Variant Cover", "1:25 Incentive", "Virgin Cover")
- printNumber: Print number (1 for first print, 2 for second, etc.)
- upcCode: The UPC/barcode number if visible
- coverPrice: The cover price if visible (e.g., "$3.99")
- isGraded: true if in a grading slab (CGC, CBCS, PGX plastic holder)
- gradingCompany: If graded, which company (cgc, cbcs, pgx) - use lowercase
- grade: If graded, the numeric grade as shown on label
- certNumber: If graded, the full certification number from the label
- coverDate: Cover date in YYYY-MM format if visible
- isKeyIssue: Whether this is likely a key issue
- keyIssueReason: If key issue, explain why with specific details
- confidence: Your confidence level (high, medium, low)

CONDITION ANALYSIS FIELDS (for RAW comics only):
- estimatedRawGrade: Your estimated numeric grade (e.g., "8.0", "7.5", "5.0") - ONLY if NOT graded
- conditionConfidence: How confident you are in the grade estimate (high, medium, low)
- conditionNotes: Brief description of the overall condition
- visibleDefects: Array of specific defects you can see (e.g., ["spine stress", "corner wear", "light crease on cover"])

COVER DETAILS (try to identify if visible):
- coverArtist: The cover artist if you can identify their style or if credited
- featuredCharacters: Array of main characters visible on the cover

JSON schema:
{
  "title": string,
  "issueNumber": string,
  "publisher": string,
  "variant": string | null,
  "printNumber": number,
  "upcCode": string | null,
  "coverPrice": string | null,
  "isGraded": boolean,
  "gradingCompany": "cgc" | "cbcs" | "pgx" | null,
  "grade": string | null,
  "certNumber": string | null,
  "coverDate": string | null,
  "isKeyIssue": boolean,
  "keyIssueReason": string | null,
  "confidence": "high" | "medium" | "low",
  "estimatedRawGrade": string | null,
  "conditionConfidence": "high" | "medium" | "low" | null,
  "conditionNotes": string | null,
  "visibleDefects": string[] | null,
  "coverArtist": string | null,
  "featuredCharacters": string[] | null
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify this comic book cover AND analyze its condition. Pay special attention to the PUBLISHER - look for logos, text, or infer from the characters. Also look for any UPC barcode and cover price. If this is a RAW comic (not in a grading slab), carefully examine visible defects and estimate a grade. Return ONLY valid JSON.'
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
      
      // Clean issue number - remove leading # if present
      if (comicData.issueNumber) {
        comicData.issueNumber = comicData.issueNumber.toString().replace(/^#/, '').trim();
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse comic data', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI identified:', comicData.title, '#' + comicData.issueNumber);

    // Step 2: Fetch full data from ComicVine (if API key is configured)
    if (COMICVINE_API_KEY && comicData.title) {
      console.log('Fetching full data from ComicVine...');
      const comicVineData = await fetchComicVineData(
        comicData.title,
        comicData.issueNumber,
        comicData.publisher,
        COMICVINE_API_KEY
      );

      if (comicVineData) {
        console.log('ComicVine match found with full data');
        
        // Check if AI detected a variant - if so, DON'T replace the cover
        const isVariant = comicData.variant && 
          (comicData.variant.toLowerCase().includes('variant') ||
           comicData.variant.toLowerCase().includes('virgin') ||
           comicData.variant.toLowerCase().includes('1:') ||
           comicData.variant.toLowerCase().includes('cover b') ||
           comicData.variant.toLowerCase().includes('cover c') ||
           comicData.variant.toLowerCase().includes('incentive') ||
           comicData.variant.toLowerCase().includes('exclusive'));
        
        // Merge ComicVine data with AI data
        comicData = {
          ...comicData,
          comicvineId: comicVineData.comicvineId,
          // Only use ComicVine cover if NOT a variant
          coverImageUrl: isVariant ? comicData.coverImageUrl : comicVineData.coverImageUrl,
          title: comicVineData.title || comicData.title,
          coverDate: comicVineData.coverDate || comicData.coverDate,
          publisher: comicVineData.publisher || comicData.publisher,
          isVariant: isVariant || false,
          // New enrichment data
          synopsis: comicVineData.synopsis,
          characters: comicVineData.characters || comicData.featuredCharacters,
          storyArc: comicVineData.storyArc,
          writer: comicVineData.writer,
          artist: comicVineData.artist,
          coverArtist: comicVineData.coverArtist || comicData.coverArtist,
          colorist: comicVineData.colorist,
          inker: comicVineData.inker,
          letterer: comicVineData.letterer,
          editor: comicVineData.editor,
        };
        
        if (isVariant) {
          console.log('Variant detected - preserving AI-identified cover');
        }
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
