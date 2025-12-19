const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComicVineResult {
  success: boolean;
  source: 'comicvine';
  metadata?: {
    title: string;
    issueNumber: string;
    volume?: string;
    publisher?: string;
    coverDate?: string;
    description?: string;
    coverImage?: string;
  };
  creators?: {
    writers: string[];
    artists: string[];
    coverArtists: string[];
  };
  characters?: string[];
  firstAppearances?: string[];
  storyArcs?: string[];
  isKeyIssue?: boolean;
  keyIssueReason?: string;
  comicvineId?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, issue_number, publisher, comicvine_id } = await req.json();

    if (!title && !comicvine_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title or ComicVine ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('COMICVINE_API_KEY');
    if (!apiKey) {
      console.error('COMICVINE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'ComicVine API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let issueData: any = null;

    // If we have a ComicVine ID, fetch directly
    if (comicvine_id) {
      console.log('Fetching by ComicVine ID:', comicvine_id);
      const issueUrl = `https://comicvine.gamespot.com/api/issue/4000-${comicvine_id}/?api_key=${apiKey}&format=json&field_list=id,name,issue_number,volume,cover_date,description,image,person_credits,character_credits,first_appearance_characters,story_arc_credits`;
      
      const response = await fetch(issueUrl, {
        headers: { 'User-Agent': 'KodexComics/1.0' },
      });
      
      const data = await response.json();
      if (data.results) {
        issueData = data.results;
      }
    } else {
      // Search for the issue
      console.log('Searching ComicVine for:', title, issue_number);
      
      // First search for the volume
      const volumeSearchUrl = `https://comicvine.gamespot.com/api/volumes/?api_key=${apiKey}&format=json&filter=name:${encodeURIComponent(title)}&field_list=id,name,publisher,start_year`;
      
      const volumeResponse = await fetch(volumeSearchUrl, {
        headers: { 'User-Agent': 'KodexComics/1.0' },
      });
      
      const volumeData = await volumeResponse.json();
      
      if (volumeData.results && volumeData.results.length > 0) {
        // Find best matching volume
        let bestVolume = volumeData.results[0];
        
        if (publisher) {
          const matchingPublisher = volumeData.results.find((v: any) => 
            v.publisher?.name?.toLowerCase().includes(publisher.toLowerCase())
          );
          if (matchingPublisher) bestVolume = matchingPublisher;
        }
        
        // Fetch issues for this volume
        const issuesUrl = `https://comicvine.gamespot.com/api/issues/?api_key=${apiKey}&format=json&filter=volume:${bestVolume.id}&field_list=id,name,issue_number,volume,cover_date,description,image,person_credits,character_credits,first_appearance_characters,story_arc_credits`;
        
        const issuesResponse = await fetch(issuesUrl, {
          headers: { 'User-Agent': 'KodexComics/1.0' },
        });
        
        const issuesData = await issuesResponse.json();
        
        if (issuesData.results) {
          // Find matching issue number
          const cleanIssueNum = issue_number?.replace(/^#/, '');
          issueData = issuesData.results.find((i: any) => 
            String(i.issue_number) === cleanIssueNum
          );
        }
      }
    }

    if (!issueData) {
      console.log('No ComicVine results found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'not_found',
          message: 'Comic not found on ComicVine' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse creators
    const writers: string[] = [];
    const artists: string[] = [];
    const coverArtists: string[] = [];
    
    if (issueData.person_credits) {
      for (const person of issueData.person_credits) {
        const role = person.role?.toLowerCase() || '';
        const name = person.name;
        
        if (role.includes('writer')) writers.push(name);
        if (role.includes('artist') || role.includes('penciler')) artists.push(name);
        if (role.includes('cover')) coverArtists.push(name);
      }
    }

    // Parse characters
    const characters = issueData.character_credits?.map((c: any) => c.name) || [];

    // Parse first appearances
    const firstAppearances = issueData.first_appearance_characters?.map((c: any) => c.name) || [];

    // Parse story arcs
    const storyArcs = issueData.story_arc_credits?.map((a: any) => a.name) || [];

    // Determine if key issue
    const isKeyIssue = firstAppearances.length > 0 || 
                       issue_number === '1' || 
                       issueData.description?.toLowerCase().includes('first appearance');
    
    const keyIssueReason = firstAppearances.length > 0 
      ? `First appearance of ${firstAppearances.join(', ')}`
      : issue_number === '1' ? 'First issue' : undefined;

    const result: ComicVineResult = {
      success: true,
      source: 'comicvine',
      metadata: {
        title: issueData.volume?.name || title,
        issueNumber: String(issueData.issue_number),
        volume: issueData.volume?.name,
        coverDate: issueData.cover_date,
        description: issueData.description?.replace(/<[^>]*>/g, '').slice(0, 500),
        coverImage: issueData.image?.medium_url,
      },
      creators: {
        writers,
        artists,
        coverArtists,
      },
      characters: characters.slice(0, 20),
      firstAppearances,
      storyArcs,
      isKeyIssue,
      keyIssueReason,
      comicvineId: String(issueData.id),
    };

    console.log('ComicVine result:', { 
      hasMetadata: !!result.metadata, 
      creatorsFound: writers.length + artists.length,
      firstAppearances: firstAppearances.length,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ComicVine fetch error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'ComicVine fetch failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
