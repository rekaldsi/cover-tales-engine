import { generateRequestId, createTimer, logProvider } from '../_shared/integration-logger.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceValue {
  source: string;
  value: number;
  grade?: string;
  lastUpdated: string;
  confidence: 'high' | 'medium' | 'low';
}

interface AggregatedResult {
  success: boolean;
  recommendedValue: number;
  valueRange: {
    low: number;
    high: number;
  };
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-100 numeric score
  sources: SourceValue[];
  fmvByGrade: Record<string, {
    recommended: number;
    range: { low: number; high: number };
    sources: { source: string; value: number }[];
  }>;
  metadata?: {
    title: string;
    issueNumber: string;
    publisher?: string;
    coverDate?: string;
    coverImage?: string;
  };
  creators?: {
    writers: string[];
    artists: string[];
    coverArtists: string[];
  };
  keyIssueInfo?: {
    isKeyIssue: boolean;
    reasons: string[];
    confirmedBy: string[];
  };
  discrepancies?: {
    field: string;
    sources: { source: string; value: any }[];
    severity: 'low' | 'medium' | 'high';
    message: string;
  }[];
  validationWarnings?: string[];
  verifiedAt: string;
}

// Helper to calculate median
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper to calculate confidence based on source agreement
function calculateConfidence(values: number[], median: number): { level: 'high' | 'medium' | 'low'; score: number } {
  if (values.length < 2) return { level: 'low', score: 25 };
  
  // Calculate coefficient of variation (CV) - lower is better
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 1;
  
  // Calculate outlier percentage
  const outliers = values.filter(v => Math.abs(v - median) / median > 0.3);
  const outlierRatio = outliers.length / values.length;
  
  // Score: more sources + lower variance + fewer outliers = higher confidence
  const sourceScore = Math.min(values.length / 4, 1) * 30; // Up to 30 points for sources
  const varianceScore = Math.max(0, 1 - cv) * 40; // Up to 40 points for low variance
  const outlierScore = (1 - outlierRatio) * 30; // Up to 30 points for few outliers
  
  const totalScore = Math.round(sourceScore + varianceScore + outlierScore);
  
  let level: 'high' | 'medium' | 'low';
  if (totalScore >= 70 && values.length >= 3) level = 'high';
  else if (totalScore >= 40) level = 'medium';
  else level = 'low';
  
  return { level, score: totalScore };
}

// Helper to detect significant discrepancies
function detectDiscrepancies(
  fmvByGrade: Record<string, { source: string; value: number }[]>
): AggregatedResult['discrepancies'] {
  const discrepancies: AggregatedResult['discrepancies'] = [];
  
  for (const [gradeKey, sources] of Object.entries(fmvByGrade)) {
    if (sources.length < 2) continue;
    
    const values = sources.map(s => s.value);
    const median = calculateMedian(values);
    
    // Check each source against the median
    for (const src of sources) {
      const deviation = Math.abs(src.value - median) / median;
      
      if (deviation > 0.5) {
        discrepancies.push({
          field: `value_${gradeKey}`,
          sources: sources,
          severity: 'high',
          message: `${src.source} reports $${src.value.toFixed(2)} which is ${(deviation * 100).toFixed(0)}% different from median $${median.toFixed(2)}`,
        });
        break; // One discrepancy per grade is enough
      } else if (deviation > 0.3) {
        discrepancies.push({
          field: `value_${gradeKey}`,
          sources: sources,
          severity: 'medium',
          message: `Price sources show ${(deviation * 100).toFixed(0)}% variance for grade ${gradeKey}`,
        });
        break;
      }
    }
  }
  
  return discrepancies;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = generateRequestId();
  const overallTimer = createTimer();

  try {
    const { 
      title, 
      issue_number, 
      publisher, 
      grade, 
      cert_number,
      grade_status,
      comicvine_id,
      user_id,
      comic_id,
      include_sources = ['gocollect', 'ebay', 'gpa', 'covrprice', 'comicvine']
    } = await req.json();

    if (!title || !issue_number) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title and issue number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Aggregating data for:`, { title, issue_number, publisher, grade, include_sources });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Helper to fetch and log each provider
    const fetchWithLogging = async (
      source: string,
      endpoint: string,
      body: Record<string, any>
    ): Promise<{ source: string; data: any; latencyMs: number }> => {
      const timer = createTimer();
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(body),
        });
        
        const data = await response.json();
        const latencyMs = timer();
        
        // Log the provider call
        await logProvider(
          {
            requestId,
            userId: user_id,
            comicId: comic_id,
            function: 'aggregate-comic-data',
            provider: source,
            httpStatus: response.status,
            inputsSummary: { title, issue_number, grade_status },
            outputsSummary: { 
              success: data?.success, 
              hasValue: !!data?.fmv || !!data?.estimatedSoldPrice,
              fieldsReturned: data ? Object.keys(data).length : 0,
            },
          },
          {
            status: data?.success ? 'ok' : 'error',
            latencyMs,
            errorCode: data?.success ? undefined : 'PROVIDER_FAILURE',
            errorMessage: data?.error?.substring(0, 200),
          }
        );
        
        return { source, data, latencyMs };
      } catch (e) {
        const latencyMs = timer();
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        
        // Log the failure
        await logProvider(
          {
            requestId,
            userId: user_id,
            comicId: comic_id,
            function: 'aggregate-comic-data',
            provider: source,
            inputsSummary: { title, issue_number },
          },
          {
            status: 'error',
            latencyMs,
            errorCode: 'FETCH_ERROR',
            errorMessage: errorMessage.substring(0, 200),
          }
        );
        
        return { source, data: { success: false, error: errorMessage }, latencyMs };
      }
    };

    // Fetch from all sources in parallel
    const fetchPromises: Promise<{ source: string; data: any; latencyMs: number }>[] = [];

    if (include_sources.includes('gocollect')) {
      fetchPromises.push(
        fetchWithLogging('gocollect', 'fetch-gocollect-value', { title, issue_number, publisher, grade, cert_number })
      );
    }

    if (include_sources.includes('ebay')) {
      fetchPromises.push(
        fetchWithLogging('ebay', 'fetch-ebay-prices', { title, issueNumber: issue_number, publisher, grade, gradeStatus: grade_status })
      );
    }

    if (include_sources.includes('gpa')) {
      fetchPromises.push(
        fetchWithLogging('gpa', 'fetch-gpa-value', { title, issue_number, publisher, grade, cert_number })
      );
    }

    if (include_sources.includes('covrprice')) {
      fetchPromises.push(
        fetchWithLogging('covrprice', 'fetch-covrprice-value', { title, issue_number, publisher, grade })
      );
    }

    if (include_sources.includes('comicvine')) {
      fetchPromises.push(
        fetchWithLogging('comicvine', 'fetch-comicvine-data', { title, issue_number, publisher, comicvine_id })
      );
    }

    // Wait for all sources with individual timeouts - don't fail the whole request if one times out
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>(resolve => setTimeout(() => resolve(fallback), timeoutMs))
      ]);
    };

    // Wrap each promise with its own timeout (15s per provider)
    const timedPromises = fetchPromises.map(p => 
      withTimeout(p, 15000, { source: 'timeout', data: { success: false, error: 'Provider timeout' }, latencyMs: 15000 })
    );

    const results = await Promise.all(timedPromises);

    console.log(`[${requestId}] Source results:`, results.map(r => ({ source: r.source, success: r.data?.success, latencyMs: r.latencyMs })));

    // Aggregate values by grade
    const fmvByGrade: Record<string, { source: string; value: number }[]> = {};
    const sources: SourceValue[] = [];
    const keyIssueIndicators: { source: string; reason?: string }[] = [];
    let metadata: AggregatedResult['metadata'] | undefined;
    let creators: AggregatedResult['creators'] | undefined;

    for (const { source, data } of results) {
      if (!data?.success) continue;

      // Extract FMV data
      if (data.fmv) {
        for (const [gradeKey, value] of Object.entries(data.fmv)) {
          if (typeof value === 'number' && value > 0) {
            if (!fmvByGrade[gradeKey]) fmvByGrade[gradeKey] = [];
            fmvByGrade[gradeKey].push({ source, value });
          }
        }
      }

      // Handle eBay special format
      if (source === 'ebay' && data.estimatedSoldPrice) {
        const gradeKey = grade_status === 'raw' ? 'raw' : (grade ? String(grade) : 'current');
        if (!fmvByGrade[gradeKey]) fmvByGrade[gradeKey] = [];
        fmvByGrade[gradeKey].push({ source: 'ebay', value: data.estimatedSoldPrice });
      }

      // Track key issue indicators
      if (data.isKeyIssue) {
        keyIssueIndicators.push({ source, reason: data.keyIssueReason });
      }

      // Get metadata from ComicVine
      if (source === 'comicvine' && data.metadata) {
        metadata = data.metadata;
        creators = data.creators;
      }
    }

    // Calculate recommended values per grade
    const aggregatedFmvByGrade: AggregatedResult['fmvByGrade'] = {};
    
    for (const [gradeKey, gradeValues] of Object.entries(fmvByGrade)) {
      const values = gradeValues.map(v => v.value);
      const median = calculateMedian(values);
      
      aggregatedFmvByGrade[gradeKey] = {
        recommended: median,
        range: {
          low: Math.min(...values),
          high: Math.max(...values),
        },
        sources: gradeValues,
      };

      // Add to sources list
      for (const sv of gradeValues) {
        const conf = calculateConfidence(values, median);
        sources.push({
          source: sv.source,
          value: sv.value,
          grade: gradeKey,
          lastUpdated: new Date().toISOString(),
          confidence: conf.level,
        });
      }
    }

    // Calculate overall recommended value
    const targetGrade = grade_status === 'raw' ? 'raw' : (grade ? String(grade) : 'current');
    const targetValues = aggregatedFmvByGrade[targetGrade] || aggregatedFmvByGrade['current'] || Object.values(aggregatedFmvByGrade)[0];
    
    const recommendedValue = targetValues?.recommended || 0;
    const valueRange = targetValues?.range || { low: 0, high: 0 };
    const allValues = sources.filter(s => s.grade === targetGrade || !s.grade).map(s => s.value);
    const confidenceResult = calculateConfidence(allValues, recommendedValue);

    // Detect discrepancies with the new helper
    const discrepancies = detectDiscrepancies(fmvByGrade);

    // Build key issue info
    const keyIssueInfo = keyIssueIndicators.length > 0 ? {
      isKeyIssue: true,
      reasons: [...new Set(keyIssueIndicators.filter(k => k.reason).map(k => k.reason!))],
      confirmedBy: keyIssueIndicators.map(k => k.source),
    } : {
      isKeyIssue: false,
      reasons: [],
      confirmedBy: [],
    };

    const result: AggregatedResult = {
      success: sources.length > 0,
      recommendedValue,
      valueRange,
      confidence: confidenceResult.level,
      confidenceScore: confidenceResult.score,
      sources,
      fmvByGrade: aggregatedFmvByGrade,
      metadata,
      creators,
      keyIssueInfo,
      discrepancies: discrepancies && discrepancies.length > 0 ? discrepancies : undefined,
      verifiedAt: new Date().toISOString(),
    };

    // Store results in comic_value_sources if comic_id is provided
    if (comic_id) {
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Prepare value source records for upsert
      const valueSourceRecords = sources.map(s => ({
        comic_id,
        provider: s.source,
        grade_context: s.grade || 'current',
        value: s.value,
        range_low: aggregatedFmvByGrade[s.grade || 'current']?.range.low || null,
        range_high: aggregatedFmvByGrade[s.grade || 'current']?.range.high || null,
        confidence: confidenceResult.score,
        comps: null, // Will be populated by provider-specific data later
        fetched_at: new Date().toISOString(),
        status: 'ok',
        error_reason: null,
      }));

      // Upsert value sources
      if (valueSourceRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('comic_value_sources')
          .upsert(valueSourceRecords, { 
            onConflict: 'comic_id,provider,grade_context',
            ignoreDuplicates: false 
          });
        
        if (upsertError) {
          console.error(`[${requestId}] Error upserting value sources:`, upsertError);
        } else {
          console.log(`[${requestId}] Stored ${valueSourceRecords.length} value sources`);
        }
      }

      // Update comic's confidence_score and value_range
      const { error: updateError } = await supabase
        .from('comics')
        .update({
          confidence_score: confidenceResult.score,
          value_range_low: valueRange.low || null,
          value_range_high: valueRange.high || null,
          current_value: recommendedValue > 0 ? recommendedValue : null,
        })
        .eq('id', comic_id);

      if (updateError) {
        console.error(`[${requestId}] Error updating comic:`, updateError);
      } else {
        console.log(`[${requestId}] Updated comic confidence_score=${confidenceResult.score}`);
      }
    }

    console.log('Aggregation complete:', { 
      sourcesUsed: sources.length,
      gradesFound: Object.keys(aggregatedFmvByGrade).length,
      confidence: confidenceResult.level,
      hasDiscrepancies: discrepancies ? discrepancies.length > 0 : false,
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Aggregation error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Aggregation failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
