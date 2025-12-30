import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comic schema fields that can be mapped
const COMIC_FIELDS = [
  { name: 'title', description: 'Comic book title/series name', required: true },
  { name: 'issueNumber', description: 'Issue number', required: false },
  { name: 'volume', description: 'Volume number', required: false },
  { name: 'publisher', description: 'Publisher name (Marvel, DC, Image, etc.)', required: false },
  { name: 'coverDate', description: 'Cover date or publication date', required: false },
  { name: 'grade', description: 'Numeric grade (0.5-10.0)', required: false },
  { name: 'gradeStatus', description: 'Grading company (CGC, CBCS, PGX) or raw', required: false },
  { name: 'certNumber', description: 'Certificate/cert number for graded comics', required: false },
  { name: 'currentValue', description: 'Current market value in dollars', required: false },
  { name: 'purchasePrice', description: 'Purchase price paid', required: false },
  { name: 'purchaseDate', description: 'Date purchased', required: false },
  { name: 'variant', description: 'Variant cover type/description', required: false },
  { name: 'isKeyIssue', description: 'Whether this is a key issue (boolean)', required: false },
  { name: 'keyIssueReason', description: 'Reason why it is a key issue', required: false },
  { name: 'writer', description: 'Writer name(s)', required: false },
  { name: 'artist', description: 'Artist/penciler name(s)', required: false },
  { name: 'coverArtist', description: 'Cover artist name', required: false },
  { name: 'isSigned', description: 'Whether the comic is signed (boolean)', required: false },
  { name: 'signedBy', description: 'Name of person who signed', required: false },
  { name: 'notes', description: 'General notes or comments', required: false },
  { name: 'location', description: 'Storage location', required: false },
  { name: 'barcode', description: 'UPC barcode', required: false },
];

interface AnalyzeRequest {
  columns: string[];
  sampleRows: Record<string, string>[];
  jobId?: string;
}

interface ColumnMapping {
  csvColumn: string;
  comicField: string | null;
  confidence: number;
  sampleValues: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[analyze-csv] Received analysis request');

  try {
    const { columns, sampleRows, jobId }: AnalyzeRequest = await req.json();

    if (!columns || columns.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No columns provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-csv] Analyzing', columns.length, 'columns with', sampleRows?.length || 0, 'sample rows');

    // Build sample values for each column
    const columnSamples: Record<string, string[]> = {};
    for (const col of columns) {
      columnSamples[col] = (sampleRows || [])
        .slice(0, 5)
        .map(row => row[col] || '')
        .filter(v => v.trim() !== '');
    }

    // Build AI prompt for column mapping
    const fieldsDescription = COMIC_FIELDS.map(f => 
      `- ${f.name}: ${f.description}${f.required ? ' (REQUIRED)' : ''}`
    ).join('\n');

    const columnsDescription = columns.map(col => {
      const samples = columnSamples[col].slice(0, 3).join('", "');
      return `- "${col}": sample values: ["${samples}"]`;
    }).join('\n');

    const systemPrompt = `You are a data mapping expert for comic book collections. Your task is to analyze CSV column headers and sample data to map them to a standard comic book schema.

Available comic fields:
${fieldsDescription}

Respond with a JSON array of mappings. Each mapping should have:
- csvColumn: the original CSV column name
- comicField: the matching comic field name (or null if no match)
- confidence: 0-100 confidence score

Consider:
1. Column names may be abbreviated or have typos
2. Combined columns like "Title / Issue" should map to the most relevant field
3. Grade columns might contain text like "CGC 9.8" - map to grade
4. Value/price columns in different currencies should map to currentValue or purchasePrice
5. Date columns should map to appropriate date fields

Return ONLY valid JSON array, no other text.`;

    const userPrompt = `Analyze these CSV columns and map them to comic fields:

${columnsDescription}

Return the mapping as a JSON array.`;

    // Call Lovable AI for intelligent mapping
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    let mappings: ColumnMapping[] = [];

    if (LOVABLE_API_KEY) {
      console.log('[analyze-csv] Using AI for column mapping');
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const aiMappings = JSON.parse(jsonMatch[0]);
            mappings = aiMappings.map((m: any) => ({
              csvColumn: m.csvColumn,
              comicField: m.comicField,
              confidence: m.confidence || 50,
              sampleValues: columnSamples[m.csvColumn] || [],
            }));
            console.log('[analyze-csv] AI mapping successful');
          } catch (parseError) {
            console.error('[analyze-csv] Failed to parse AI response:', parseError);
          }
        }
      } else {
        console.error('[analyze-csv] AI request failed:', aiResponse.status);
      }
    }

    // Fallback: Use heuristic mapping if AI didn't work
    if (mappings.length === 0) {
      console.log('[analyze-csv] Using heuristic fallback mapping');
      mappings = columns.map(col => {
        const lowerCol = col.toLowerCase().replace(/[_\-\s]+/g, '');
        let match: { field: string; confidence: number } | null = null;

        // Simple heuristic matching
        if (lowerCol.includes('title') || lowerCol.includes('series') || lowerCol.includes('name')) {
          match = { field: 'title', confidence: 80 };
        } else if (lowerCol.includes('issue') || lowerCol === 'no' || lowerCol === 'num' || lowerCol === '#') {
          match = { field: 'issueNumber', confidence: 75 };
        } else if (lowerCol.includes('publisher') || lowerCol.includes('pub')) {
          match = { field: 'publisher', confidence: 80 };
        } else if (lowerCol.includes('grade') && !lowerCol.includes('status')) {
          match = { field: 'grade', confidence: 70 };
        } else if (lowerCol.includes('cert') || lowerCol.includes('certificate')) {
          match = { field: 'certNumber', confidence: 85 };
        } else if (lowerCol.includes('value') || lowerCol.includes('fmv') || lowerCol.includes('worth')) {
          match = { field: 'currentValue', confidence: 70 };
        } else if (lowerCol.includes('paid') || lowerCol.includes('cost') || lowerCol.includes('purchase') && lowerCol.includes('price')) {
          match = { field: 'purchasePrice', confidence: 75 };
        } else if (lowerCol.includes('variant') || lowerCol.includes('cover')) {
          match = { field: 'variant', confidence: 60 };
        } else if (lowerCol.includes('writer') || lowerCol.includes('author')) {
          match = { field: 'writer', confidence: 80 };
        } else if (lowerCol.includes('artist') || lowerCol.includes('pencil')) {
          match = { field: 'artist', confidence: 75 };
        } else if (lowerCol.includes('note') || lowerCol.includes('comment')) {
          match = { field: 'notes', confidence: 70 };
        } else if (lowerCol.includes('location') || lowerCol.includes('box') || lowerCol.includes('storage')) {
          match = { field: 'location', confidence: 70 };
        } else if (lowerCol.includes('key') && lowerCol.includes('issue')) {
          match = { field: 'isKeyIssue', confidence: 75 };
        } else if (lowerCol.includes('signed') || lowerCol.includes('signature')) {
          match = { field: 'isSigned', confidence: 70 };
        }

        return {
          csvColumn: col,
          comicField: match?.field || null,
          confidence: match?.confidence || 0,
          sampleValues: columnSamples[col] || [],
        };
      });
    }

    // Update job status if jobId provided
    if (jobId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('import_jobs')
        .update({
          status: 'analyzed',
          column_mapping: mappings,
          detected_columns: columns,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    console.log('[analyze-csv] Returning', mappings.length, 'column mappings');

    return new Response(
      JSON.stringify({ 
        success: true,
        mappings,
        unmappedCount: mappings.filter(m => !m.comicField).length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[analyze-csv] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
