import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoCollectComic {
  id: string;
  title: string;
  issue_number: string;
  publisher: string;
  cover_date?: string;
  grading_company?: string;
  grade?: number;
  cert_number?: string;
  fmv?: number;
  purchase_price?: number;
  is_key?: boolean;
  key_reason?: string;
  cover_image_url?: string;
  variant?: string;
}

interface GoCollectResponse {
  data: GoCollectComic[];
  total: number;
  page: number;
  per_page: number;
}

// Fetch with retry logic and timeout
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  timeoutMs = 30000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Don't retry on client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error - will retry
      console.log(`Attempt ${attempt}/${maxRetries} failed with status ${response.status}`);
      lastError = new Error(`HTTP ${response.status}`);
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Attempt ${attempt}/${maxRetries} timed out after ${timeoutMs}ms`);
        lastError = new Error('Request timed out');
      } else {
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    // Exponential backoff: 2s, 4s, 8s
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOCOLLECT_API_KEY = Deno.env.get('GOCOLLECT_API_KEY');
    if (!GOCOLLECT_API_KEY) {
      throw new Error('GOCOLLECT_API_KEY not configured');
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Starting GoCollect sync for user: ${user.id}`);

    // Fetch collection from GoCollect API
    // Fixed URL: removed extra /api/ segment
    const collectibles: GoCollectComic[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching page ${page} from GoCollect...`);
      
      const response = await fetchWithRetry(
        `https://api.gocollect.com/v1/collectibles?page=${page}&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${GOCOLLECT_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GoCollect API error: ${response.status} - ${errorText}`);
        
        // Handle specific error codes with user-friendly messages
        if (response.status === 401 || response.status === 403) {
          throw new Error('GoCollect API authentication failed. Please check your API key.');
        }
        
        if (response.status === 522 || response.status === 524) {
          throw new Error('GoCollect servers are temporarily unavailable. Please try again in a few minutes.');
        }
        
        if (response.status >= 500) {
          throw new Error('GoCollect is experiencing server issues. Please try again later.');
        }
        
        throw new Error(`GoCollect API error: ${response.status}`);
      }

      const data: GoCollectResponse = await response.json();
      console.log(`Received ${data.data?.length || 0} comics from page ${page}`);
      
      if (data.data && data.data.length > 0) {
        collectibles.push(...data.data);
        page++;
        hasMore = collectibles.length < data.total;
      } else {
        hasMore = false;
      }

      // Rate limiting - be nice to their API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Total comics fetched from GoCollect: ${collectibles.length}`);

    // Get existing comics for this user
    const { data: existingComics, error: fetchError } = await supabase
      .from('comics')
      .select('id, title, issue_number, cert_number')
      .eq('user_id', user.id);

    if (fetchError) {
      console.error('Error fetching existing comics:', fetchError);
      throw fetchError;
    }

    // Map GoCollect data to our format
    const comicsToInsert = [];
    const comicsToUpdate = [];

    for (const gc of collectibles) {
      // Map grade status
      let gradeStatus = 'raw';
      if (gc.grading_company) {
        const company = gc.grading_company.toLowerCase();
        if (company.includes('cgc')) gradeStatus = 'cgc';
        else if (company.includes('cbcs')) gradeStatus = 'cbcs';
        else if (company.includes('pgx')) gradeStatus = 'pgx';
      }

      const comicData = {
        user_id: user.id,
        title: gc.title,
        issue_number: gc.issue_number?.toString() || null,
        publisher: gc.publisher || null,
        cover_date: gc.cover_date || null,
        grade_status: gradeStatus,
        grade: gc.grade || null,
        cert_number: gc.cert_number || null,
        current_value: gc.fmv || null,
        purchase_price: gc.purchase_price || null,
        is_key_issue: gc.is_key || false,
        key_issue_reason: gc.key_reason || null,
        cover_image_url: gc.cover_image_url || null,
        variant_type: gc.variant || null,
        notes: `Imported from GoCollect (ID: ${gc.id})`,
      };

      // Check if comic already exists (by cert number for graded, or title+issue for raw)
      let existingComic = null;
      if (gc.cert_number) {
        existingComic = existingComics?.find(c => c.cert_number === gc.cert_number);
      } else {
        existingComic = existingComics?.find(
          c => c.title === gc.title && c.issue_number === gc.issue_number?.toString()
        );
      }

      if (existingComic) {
        comicsToUpdate.push({ id: existingComic.id, ...comicData });
      } else {
        comicsToInsert.push(comicData);
      }
    }

    console.log(`Comics to insert: ${comicsToInsert.length}, Comics to update: ${comicsToUpdate.length}`);

    // Insert new comics
    let insertedCount = 0;
    if (comicsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('comics')
        .insert(comicsToInsert);

      if (insertError) {
        console.error('Error inserting comics:', insertError);
        throw insertError;
      }
      insertedCount = comicsToInsert.length;
    }

    // Update existing comics
    let updatedCount = 0;
    for (const comic of comicsToUpdate) {
      const { id, ...updateData } = comic;
      const { error: updateError } = await supabase
        .from('comics')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error(`Error updating comic ${id}:`, updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`Sync complete. Inserted: ${insertedCount}, Updated: ${updatedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        imported: insertedCount,
        updated: updatedCount,
        total: collectibles.length,
        message: `Successfully synced ${insertedCount + updatedCount} comics from GoCollect`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('GoCollect sync error:', error);
    
    let errorMessage = 'Failed to sync with GoCollect';
    if (error instanceof Error) {
      if (error.message === 'Request timed out') {
        errorMessage = 'GoCollect servers are not responding. Please try again later.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
