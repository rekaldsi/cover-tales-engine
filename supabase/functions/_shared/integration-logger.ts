// Shared logging utility for edge functions
// Creates structured log envelopes and writes to integration_runs table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface IntegrationLogParams {
  requestId?: string;
  userId?: string;
  comicId?: string;
  function: string;
  provider: string;
  step?: string;
  httpStatus?: number;
  inputsSummary?: Record<string, any>;
  outputsSummary?: Record<string, any>;
}

export interface IntegrationLogResult {
  status: 'ok' | 'error' | 'partial';
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
}

// Generate a unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a timer for measuring latency
export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

// Log to console with structured format
export function logStep(
  params: IntegrationLogParams,
  result: IntegrationLogResult
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    request_id: params.requestId,
    user_id: params.userId,
    comic_id: params.comicId,
    function: params.function,
    provider: params.provider,
    step: params.step,
    status: result.status,
    latency_ms: result.latencyMs,
    http_status: params.httpStatus,
    error_code: result.errorCode,
    error_message: result.errorMessage,
    inputs: params.inputsSummary,
    outputs: result.status === 'ok' ? params.outputsSummary : undefined,
  };

  if (result.status === 'error') {
    console.error('[INTEGRATION]', JSON.stringify(logEntry));
  } else {
    console.log('[INTEGRATION]', JSON.stringify(logEntry));
  }
}

// Write to integration_runs table for persistent audit
export async function logIntegrationRun(
  params: IntegrationLogParams,
  result: IntegrationLogResult
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[INTEGRATION] Missing Supabase credentials for logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const summary: Record<string, any> = {};
    if (params.inputsSummary) summary.inputs = params.inputsSummary;
    if (params.outputsSummary) summary.outputs = params.outputsSummary;
    if (params.step) summary.step = params.step;

    const { error } = await supabase.from('integration_runs').insert({
      request_id: params.requestId,
      user_id: params.userId || null,
      comic_id: params.comicId || null,
      function: params.function,
      provider: params.provider,
      status: result.status,
      latency_ms: result.latencyMs,
      http_status: params.httpStatus || null,
      error_code: result.errorCode || null,
      error_message: result.errorMessage || null,
      summary: Object.keys(summary).length > 0 ? summary : null,
    });

    if (error) {
      console.error('[INTEGRATION] Failed to log to database:', error.message);
    }
  } catch (e) {
    console.error('[INTEGRATION] Logger error:', e);
  }
}

// Convenience wrapper that logs to both console and database
export async function logProvider(
  params: IntegrationLogParams,
  result: IntegrationLogResult
): Promise<void> {
  logStep(params, result);
  await logIntegrationRun(params, result);
}

// Helper to wrap a provider call with logging
export async function withProviderLogging<T>(
  params: Omit<IntegrationLogParams, 'inputsSummary' | 'outputsSummary'>,
  inputsSummary: Record<string, any>,
  providerFn: () => Promise<T>,
  outputSummarizer?: (result: T) => Record<string, any>
): Promise<{ result: T | null; success: boolean; error?: string }> {
  const timer = createTimer();
  const fullParams: IntegrationLogParams = {
    ...params,
    inputsSummary,
  };

  try {
    const result = await providerFn();
    const latencyMs = timer();
    
    const outputsSummary = outputSummarizer ? outputSummarizer(result) : { received: true };
    
    await logProvider(
      { ...fullParams, outputsSummary },
      { status: 'ok', latencyMs }
    );

    return { result, success: true };
  } catch (error) {
    const latencyMs = timer();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await logProvider(
      fullParams,
      { 
        status: 'error', 
        latencyMs,
        errorCode: 'PROVIDER_ERROR',
        errorMessage: errorMessage.substring(0, 500), // Sanitize
      }
    );

    return { result: null, success: false, error: errorMessage };
  }
}
