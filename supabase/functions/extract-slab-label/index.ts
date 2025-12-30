import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  imageUrl: string;
  slabType?: 'cgc' | 'cbcs' | 'pgx' | 'unknown';
}

interface ExtractedLabel {
  certNumber?: string;
  grade?: number;
  labelType?: string;
  title?: string;
  issueNumber?: string;
  publisher?: string;
  pageQuality?: string;
  signatureInfo?: string;
  confidence: number;
}

interface ExtractResponse {
  enabled: boolean;
  message: string;
  extracted?: ExtractedLabel;
  rawText?: string;
}

/**
 * extract-slab-label - Stub for OCR-based slab label extraction
 * 
 * This function will use OCR to extract structured data from graded comic slab labels:
 * - CGC labels (blue, yellow, green signatures)
 * - CBCS labels
 * - PGX labels
 * 
 * Features planned:
 * - Cert number extraction and auto-verification
 * - Grade extraction with label type detection
 * - Signature series detection
 * - Page quality notation parsing
 * 
 * Current status: DISABLED - awaiting OCR provider configuration
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[extract-slab-label] Extraction request received');

  try {
    const body: ExtractRequest = await req.json();
    console.log('[extract-slab-label] Processing slab image, type:', body.slabType || 'unknown');

    // Stub response - extraction not yet enabled
    const response: ExtractResponse = {
      enabled: false,
      message: 'Slab label OCR extraction is not yet configured. This feature will use computer vision to read graded comic labels automatically.',
    };

    console.log('[extract-slab-label] Returning disabled status');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[extract-slab-label] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process extraction request',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
