import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.88.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshResult {
  success: boolean;
  comicsProcessed: number;
  valuesUpdated: number;
  historyRecorded: number;
  errors: string[];
  significantChanges: Array<{
    comicId: string;
    title: string;
    oldValue: number;
    newValue: number;
    changePercent: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  
  // Use service role for scheduled tasks to bypass RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, batchSize = 50, dryRun = false } = await req.json().catch(() => ({}));
    
    console.log('Starting scheduled value refresh', { userId, batchSize, dryRun });

    // Get comics that need value refresh
    // Priority: comics without values, then oldest updated
    let query = supabase
      .from('comics')
      .select('id, user_id, title, issue_number, publisher, grade, grade_status, current_value, updated_at')
      .order('updated_at', { ascending: true })
      .limit(batchSize);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: comics, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch comics:', fetchError);
      throw fetchError;
    }

    if (!comics || comics.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No comics to refresh', comicsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${comics.length} comics for value refresh`);

    const result: RefreshResult = {
      success: true,
      comicsProcessed: comics.length,
      valuesUpdated: 0,
      historyRecorded: 0,
      errors: [],
      significantChanges: [],
    };

    // Process each comic
    for (const comic of comics) {
      try {
        // Call aggregator to get fresh values
        const aggregatorResponse = await fetch(`${supabaseUrl}/functions/v1/aggregate-comic-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            title: comic.title,
            issue_number: comic.issue_number,
            publisher: comic.publisher,
            grade: comic.grade,
            grade_status: comic.grade_status,
            include_sources: ['gocollect', 'ebay', 'gpa', 'covrprice'],
          }),
        });

        const aggregatedData = await aggregatorResponse.json();

        if (!aggregatedData.success || !aggregatedData.recommendedValue) {
          console.log(`No value found for ${comic.title} #${comic.issue_number}`);
          continue;
        }

        const newValue = aggregatedData.recommendedValue;
        const oldValue = comic.current_value || 0;
        const valueSource = aggregatedData.sources?.[0]?.source || 'aggregated';

        // Check for significant change (>10%)
        if (oldValue > 0) {
          const changePercent = ((newValue - oldValue) / oldValue) * 100;
          if (Math.abs(changePercent) >= 10) {
            result.significantChanges.push({
              comicId: comic.id,
              title: `${comic.title} #${comic.issue_number}`,
              oldValue,
              newValue,
              changePercent: Math.round(changePercent * 100) / 100,
            });
          }
        }

        if (!dryRun) {
          // Update comic current_value
          const { error: updateError } = await supabase
            .from('comics')
            .update({ 
              current_value: newValue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', comic.id);

          if (updateError) {
            result.errors.push(`Failed to update ${comic.id}: ${updateError.message}`);
            continue;
          }
          result.valuesUpdated++;

          // Record value history
          const { error: historyError } = await supabase
            .from('comic_value_history')
            .insert({
              comic_id: comic.id,
              value: newValue,
              source: valueSource,
            });

          if (historyError) {
            console.error(`Failed to record history for ${comic.id}:`, historyError);
          } else {
            result.historyRecorded++;
          }
        } else {
          result.valuesUpdated++;
          result.historyRecorded++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Comic ${comic.id}: ${errorMsg}`);
        console.error(`Error processing comic ${comic.id}:`, err);
      }
    }

    // Update collection snapshots for affected users
    if (!dryRun) {
      const userIds = [...new Set(comics.map(c => c.user_id))];
      
      for (const uid of userIds) {
        try {
          // Calculate user's collection totals
          const { data: userComics } = await supabase
            .from('comics')
            .select('current_value, grade_status, is_key_issue')
            .eq('user_id', uid);

          if (userComics) {
            const totalValue = userComics.reduce((sum, c) => sum + (c.current_value || 0), 0);
            const comicCount = userComics.length;
            const gradedCount = userComics.filter(c => c.grade_status !== 'raw').length;
            const keyIssueCount = userComics.filter(c => c.is_key_issue).length;

            const today = new Date().toISOString().split('T')[0];
            
            await supabase
              .from('collection_snapshots')
              .upsert({
                user_id: uid,
                total_value: totalValue,
                comic_count: comicCount,
                graded_count: gradedCount,
                key_issue_count: keyIssueCount,
                snapshot_date: today,
              }, {
                onConflict: 'user_id,snapshot_date',
              });
          }
        } catch (err) {
          console.error(`Failed to update snapshot for user ${uid}:`, err);
        }
      }
    }

    console.log('Refresh complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scheduled refresh error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Refresh failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
