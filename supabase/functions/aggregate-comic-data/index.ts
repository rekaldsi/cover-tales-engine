import { generateRequestId, createTimer, logProvider } from '../_shared/integration-logger.ts';

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

    // Wait for all sources with timeout
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 30000)
    );

    const results = await Promise.race([
      Promise.all(fetchPromises),
      timeoutPromise.then(() => [])
    ]) as { source: string; data: any; latencyMs: number }[];

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
