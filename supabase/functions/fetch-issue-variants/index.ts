import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COMICVINE_API = 'https://comicvine.gamespot.com/api';

interface CoverOption {
  id: string;
  label: string;
  imageUrl: string;
  isDefault: boolean;
  source: 'comicvine' | 'metron' | 'user';
  issueId?: string;
}

interface VariantsResult {
  success: boolean;
  covers: CoverOption[];
  issueTitle?: string;
  volumeId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issueNumber, publisher, userPhoto } = await req.json();

    if (!title || !issueNumber) {
      return new Response(
        JSON.stringify({ success: false, covers: [], error: 'Title and issue number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const COMICVINE_API_KEY = Deno.env.get('COMICVINE_API_KEY');
    
    if (!COMICVINE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, covers: [], error: 'ComicVine API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching variants for:', title, '#', issueNumber);

    const covers: CoverOption[] = [];

    // Step 1: Search for the volume
    const volumeSearchUrl = new URL(`${COMICVINE_API}/search/`);
    volumeSearchUrl.searchParams.set('api_key', COMICVINE_API_KEY);
    volumeSearchUrl.searchParams.set('format', 'json');
    volumeSearchUrl.searchParams.set('resources', 'volume');
    volumeSearchUrl.searchParams.set('query', title);
    volumeSearchUrl.searchParams.set('limit', '10');

    const volumeResponse = await fetch(volumeSearchUrl.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
    });

    if (!volumeResponse.ok) {
      throw new Error('ComicVine volume search failed');
    }

    const volumeData = await volumeResponse.json();
    const volumes = volumeData.results || [];

    if (volumes.length === 0) {
      // Return user photo as only option if no volumes found
      if (userPhoto) {
        covers.push({
          id: 'user_photo',
          label: 'My Photo',
          imageUrl: userPhoto,
          isDefault: true,
          source: 'user',
        });
      }
      return new Response(
        JSON.stringify({ success: true, covers, error: 'No matching volumes found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best matching volume by publisher
    let matchedVolume = volumes[0];
    if (publisher) {
      const publisherLower = publisher.toLowerCase();
      const publisherMatch = volumes.find((v: any) =>
        v.publisher?.name?.toLowerCase().includes(publisherLower) ||
        publisherLower.includes(v.publisher?.name?.toLowerCase() || '')
      );
      if (publisherMatch) matchedVolume = publisherMatch;
    }

    const volumeId = matchedVolume.id;
    console.log('Matched volume:', matchedVolume.name, 'ID:', volumeId);

    // Step 2: Fetch issues from volume
    const issuesUrl = new URL(`${COMICVINE_API}/issues/`);
    issuesUrl.searchParams.set('api_key', COMICVINE_API_KEY);
    issuesUrl.searchParams.set('format', 'json');
    issuesUrl.searchParams.set('filter', `volume:${volumeId}`);
    issuesUrl.searchParams.set('limit', '100');
    issuesUrl.searchParams.set('field_list', 'id,issue_number,name,image,cover_date,associated_images');

    const issuesResponse = await fetch(issuesUrl.toString(), {
      headers: { 'User-Agent': 'KODEX/1.0' }
    });

    if (!issuesResponse.ok) {
      throw new Error('ComicVine issues fetch failed');
    }

    const issuesData = await issuesResponse.json();
    const issues = issuesData.results || [];

    // Find matching issue(s) - could be multiple variants
    const cleanIssueNum = issueNumber.toString().replace(/^#/, '').trim();
    const matchingIssues = issues.filter((i: any) =>
      i.issue_number === cleanIssueNum ||
      parseInt(i.issue_number) === parseInt(cleanIssueNum)
    );

    console.log(`Found ${matchingIssues.length} matching issues for #${cleanIssueNum}`);

    // Process each matching issue
    for (let idx = 0; idx < matchingIssues.length; idx++) {
      const issue = matchingIssues[idx];
      const mainCoverUrl = issue.image?.original_url || issue.image?.medium_url;

      if (mainCoverUrl) {
        // Determine label based on issue name or position
        let label = 'Cover A';
        if (issue.name) {
          // Parse variant info from issue name
          const name = issue.name.toLowerCase();
          if (name.includes('variant')) label = 'Variant';
          else if (name.includes('virgin')) label = 'Virgin';
          else if (name.includes('incentive') || name.includes('1:')) {
            const match = name.match(/1:\d+/);
            label = match ? `${match[0]} Variant` : 'Incentive Variant';
          }
          else if (name.includes('cover b')) label = 'Cover B';
          else if (name.includes('cover c')) label = 'Cover C';
          else if (name.includes('cover d')) label = 'Cover D';
          else if (name.includes('newsstand')) label = 'Newsstand';
          else if (name.includes('direct')) label = 'Direct Edition';
          else if (name.includes('foil')) label = 'Foil Cover';
          else if (name.includes('sketch')) label = 'Sketch Cover';
          else if (issue.name.length < 50) label = issue.name;
          else if (idx > 0) label = `Cover ${String.fromCharCode(65 + idx)}`;
        } else if (idx > 0) {
          label = `Cover ${String.fromCharCode(65 + idx)}`;
        }

        covers.push({
          id: `cv_${issue.id}`,
          label,
          imageUrl: mainCoverUrl,
          isDefault: idx === 0,
          source: 'comicvine',
          issueId: issue.id.toString(),
        });
      }

      // Check for associated_images (additional variant covers)
      if (issue.associated_images && Array.isArray(issue.associated_images)) {
        for (let imgIdx = 0; imgIdx < issue.associated_images.length; imgIdx++) {
          const assocImg = issue.associated_images[imgIdx];
          if (assocImg.original_url || assocImg.medium_url) {
            covers.push({
              id: `cv_${issue.id}_assoc_${imgIdx}`,
              label: assocImg.caption || `Variant ${imgIdx + 1}`,
              imageUrl: assocImg.original_url || assocImg.medium_url,
              isDefault: false,
              source: 'comicvine',
              issueId: issue.id.toString(),
            });
          }
        }
      }
    }

    // Add user's photo as an option if provided
    if (userPhoto) {
      covers.push({
        id: 'user_photo',
        label: 'My Photo',
        imageUrl: userPhoto,
        isDefault: covers.length === 0, // Default if no other covers
        source: 'user',
      });
    }

    // De-duplicate covers by image URL
    const uniqueCovers = covers.reduce((acc: CoverOption[], curr) => {
      if (!acc.find(c => c.imageUrl === curr.imageUrl)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    console.log(`Returning ${uniqueCovers.length} unique covers`);

    const result: VariantsResult = {
      success: true,
      covers: uniqueCovers,
      issueTitle: `${matchedVolume.name} #${cleanIssueNum}`,
      volumeId: volumeId.toString(),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fetch variants error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        covers: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
