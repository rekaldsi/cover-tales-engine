import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertDetails {
  certNumber: string;
  company: 'cgc' | 'cbcs' | 'pgx';
  verified: boolean;
  grade?: string;
  title?: string;
  issue?: string;
  publisher?: string;
  pageQuality?: string;
  labelType?: string;
  graderNotes?: string[];
  gradedDate?: string;
  error?: string;
}

async function fetchCGCDetails(certNumber: string): Promise<CertDetails> {
  const url = `https://www.cgccomics.com/certlookup/${certNumber}/`;
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'KODEX/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      return { certNumber, company: 'cgc', verified: false, error: 'Certificate not found' };
    }
    
    const html = await response.text();
    
    // Parse basic info from HTML
    const gradeMatch = html.match(/class="grade[^"]*"[^>]*>([0-9.]+)</);
    const titleMatch = html.match(/class="title[^"]*"[^>]*>([^<]+)</);
    const pageQualityMatch = html.match(/Page Quality[^<]*<[^>]+>([^<]+)</i);
    const labelMatch = html.match(/label-type[^>]*>([^<]+)</i);
    
    // Check if it's a valid certificate page
    const isValid = html.includes('Certificate Verification') || 
                   html.includes('certlookup') ||
                   gradeMatch !== null;
    
    return {
      certNumber,
      company: 'cgc',
      verified: isValid,
      grade: gradeMatch?.[1],
      title: titleMatch?.[1]?.trim(),
      pageQuality: pageQualityMatch?.[1]?.trim(),
      labelType: labelMatch?.[1]?.trim(),
    };
  } catch (error) {
    console.error('CGC fetch error:', error);
    return { certNumber, company: 'cgc', verified: false, error: 'Failed to fetch certificate' };
  }
}

async function fetchCBCSDetails(certNumber: string): Promise<CertDetails> {
  const url = `https://www.cbcscomics.com/cbcs-cert-verification/?cert_num=${certNumber}`;
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'KODEX/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      return { certNumber, company: 'cbcs', verified: false, error: 'Certificate not found' };
    }
    
    const html = await response.text();
    
    // Parse CBCS page structure
    const gradeMatch = html.match(/Grade[^<]*<[^>]+>([0-9.]+)/i);
    const titleMatch = html.match(/Title[^<]*<[^>]+>([^<]+)/i);
    const pageQualityMatch = html.match(/Page Quality[^<]*<[^>]+>([^<]+)/i);
    
    const isValid = html.includes('verification') && 
                   (gradeMatch !== null || html.includes(certNumber));
    
    return {
      certNumber,
      company: 'cbcs',
      verified: isValid,
      grade: gradeMatch?.[1],
      title: titleMatch?.[1]?.trim(),
      pageQuality: pageQualityMatch?.[1]?.trim(),
    };
  } catch (error) {
    console.error('CBCS fetch error:', error);
    return { certNumber, company: 'cbcs', verified: false, error: 'Failed to fetch certificate' };
  }
}

async function fetchPGXDetails(certNumber: string): Promise<CertDetails> {
  const url = `https://www.pgxcomics.com/certifications/verify?serial=${certNumber}`;
  
  try {
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'KODEX/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      return { certNumber, company: 'pgx', verified: false, error: 'Certificate not found' };
    }
    
    const html = await response.text();
    
    // Parse PGX page
    const gradeMatch = html.match(/Grade[^<]*<[^>]+>([0-9.]+)/i);
    const titleMatch = html.match(/Title[^<]*<[^>]+>([^<]+)/i);
    
    const isValid = html.includes('verify') && 
                   (gradeMatch !== null || html.includes(certNumber));
    
    return {
      certNumber,
      company: 'pgx',
      verified: isValid,
      grade: gradeMatch?.[1],
      title: titleMatch?.[1]?.trim(),
    };
  } catch (error) {
    console.error('PGX fetch error:', error);
    return { certNumber, company: 'pgx', verified: false, error: 'Failed to fetch certificate' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certNumber, company } = await req.json();

    if (!certNumber) {
      return new Response(
        JSON.stringify({ error: 'Certificate number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!company || !['cgc', 'cbcs', 'pgx'].includes(company)) {
      return new Response(
        JSON.stringify({ error: 'Valid company (cgc, cbcs, pgx) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching ${company.toUpperCase()} cert details for: ${certNumber}`);

    let details: CertDetails;
    
    switch (company) {
      case 'cgc':
        details = await fetchCGCDetails(certNumber);
        break;
      case 'cbcs':
        details = await fetchCBCSDetails(certNumber);
        break;
      case 'pgx':
        details = await fetchPGXDetails(certNumber);
        break;
      default:
        details = { certNumber, company, verified: false, error: 'Unknown company' };
    }

    console.log('Cert details result:', details);

    return new Response(
      JSON.stringify(details),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in fetch-cert-details:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
