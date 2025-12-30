import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnMapping {
  csvColumn: string;
  comicField: string | null;
}

interface ImportRequest {
  jobId: string;
  rows: Record<string, string>[];
  mappings: ColumnMapping[];
  userId: string;
}

// Parse grade from various formats
function parseGrade(value: string): { grade: number | null; gradeStatus: string } {
  if (!value) return { grade: null, gradeStatus: 'raw' };
  
  const cleaned = value.trim().toUpperCase();
  
  // Check for grading company prefixes
  let gradeStatus = 'raw';
  let gradeStr = cleaned;
  
  if (cleaned.includes('CGC')) {
    gradeStatus = 'cgc';
    gradeStr = cleaned.replace(/CGC\s*/i, '');
  } else if (cleaned.includes('CBCS')) {
    gradeStatus = 'cbcs';
    gradeStr = cleaned.replace(/CBCS\s*/i, '');
  } else if (cleaned.includes('PGX')) {
    gradeStatus = 'pgx';
    gradeStr = cleaned.replace(/PGX\s*/i, '');
  }
  
  // Extract numeric grade
  const gradeMatch = gradeStr.match(/(\d+\.?\d*)/);
  const grade = gradeMatch ? parseFloat(gradeMatch[1]) : null;
  
  // Validate grade range
  if (grade !== null && (grade < 0.5 || grade > 10)) {
    return { grade: null, gradeStatus: 'raw' };
  }
  
  return { grade, gradeStatus };
}

// Parse price/value from various formats
function parsePrice(value: string): number | null {
  if (!value) return null;
  
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$€£,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// Parse boolean from various formats
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return ['true', 'yes', 'y', '1', 'x', '✓', '✔'].includes(lower);
}

// Parse date from various formats
function parseDate(value: string): string | null {
  if (!value) return null;
  
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  
  return parsed.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[import-csv] Received import request');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { jobId, rows, mappings, userId }: ImportRequest = await req.json();

    if (!jobId || !rows || !mappings || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jobId, rows, mappings, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[import-csv] Processing', rows.length, 'rows for job', jobId);

    // Update job status to importing
    await supabase
      .from('import_jobs')
      .update({ 
        status: 'importing', 
        total_rows: rows.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Build mapping lookup
    const fieldMap: Record<string, string> = {};
    for (const m of mappings) {
      if (m.comicField) {
        fieldMap[m.csvColumn] = m.comicField;
      }
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Insert import_row record
        const { data: importRow, error: rowInsertError } = await supabase
          .from('import_rows')
          .insert({
            import_job_id: jobId,
            row_number: rowNumber,
            raw_data: row,
            status: 'processing',
          })
          .select()
          .single();

        if (rowInsertError) {
          console.error('[import-csv] Failed to insert import row:', rowInsertError);
          failCount++;
          continue;
        }

        // Transform row data using mappings
        const comicData: Record<string, any> = {
          user_id: userId,
        };

        for (const [csvCol, value] of Object.entries(row)) {
          const comicField = fieldMap[csvCol];
          if (!comicField || !value || value.trim() === '') continue;

          // Transform value based on field type
          switch (comicField) {
            case 'title':
              comicData.title = value.trim();
              break;
            case 'issueNumber':
              comicData.issue_number = value.trim();
              break;
            case 'volume':
              comicData.volume = value.trim();
              break;
            case 'publisher':
              comicData.publisher = value.trim();
              break;
            case 'grade':
              const gradeInfo = parseGrade(value);
              if (gradeInfo.grade) comicData.grade = gradeInfo.grade;
              comicData.grade_status = gradeInfo.gradeStatus;
              break;
            case 'gradeStatus':
              comicData.grade_status = value.toLowerCase().trim();
              break;
            case 'certNumber':
              comicData.cert_number = value.trim();
              break;
            case 'currentValue':
              const val = parsePrice(value);
              if (val) comicData.current_value = val;
              break;
            case 'purchasePrice':
              const price = parsePrice(value);
              if (price) comicData.purchase_price = price;
              break;
            case 'purchaseDate':
              const pDate = parseDate(value);
              if (pDate) comicData.purchase_date = pDate;
              break;
            case 'coverDate':
              const cDate = parseDate(value);
              if (cDate) comicData.cover_date = cDate;
              break;
            case 'variant':
              comicData.variant_type = value.trim();
              break;
            case 'isKeyIssue':
              comicData.is_key_issue = parseBoolean(value);
              break;
            case 'keyIssueReason':
              comicData.key_issue_reason = value.trim();
              break;
            case 'writer':
              comicData.writer = value.trim();
              break;
            case 'artist':
              comicData.artist = value.trim();
              break;
            case 'coverArtist':
              comicData.cover_artist = value.trim();
              break;
            case 'isSigned':
              comicData.is_signed = parseBoolean(value);
              break;
            case 'signedBy':
              comicData.signed_by = value.trim();
              break;
            case 'notes':
              comicData.notes = value.trim();
              break;
            case 'location':
              comicData.location = value.trim();
              break;
            case 'barcode':
              comicData.barcode = value.trim();
              break;
          }
        }

        // Validate required fields
        if (!comicData.title) {
          await supabase
            .from('import_rows')
            .update({ 
              status: 'error', 
              error_message: 'Missing required field: title',
              parsed_data: comicData,
            })
            .eq('id', importRow.id);
          failCount++;
          errors.push(`Row ${rowNumber}: Missing title`);
          continue;
        }

        // Ensure grade_status has a default
        if (!comicData.grade_status) {
          comicData.grade_status = 'raw';
        }

        // Insert comic
        const { data: comic, error: comicError } = await supabase
          .from('comics')
          .insert(comicData)
          .select()
          .single();

        if (comicError) {
          console.error('[import-csv] Failed to insert comic:', comicError);
          await supabase
            .from('import_rows')
            .update({ 
              status: 'error', 
              error_message: comicError.message,
              parsed_data: comicData,
            })
            .eq('id', importRow.id);
          failCount++;
          errors.push(`Row ${rowNumber}: ${comicError.message}`);
          continue;
        }

        // Update import row with success
        await supabase
          .from('import_rows')
          .update({ 
            status: 'success', 
            comic_id: comic.id,
            parsed_data: comicData,
          })
          .eq('id', importRow.id);

        successCount++;

        // Update job progress periodically
        if (rowNumber % 10 === 0 || rowNumber === rows.length) {
          await supabase
            .from('import_jobs')
            .update({ 
              processed_rows: rowNumber,
              successful_rows: successCount,
              failed_rows: failCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }

      } catch (rowError) {
        console.error('[import-csv] Error processing row', rowNumber, ':', rowError);
        failCount++;
        errors.push(`Row ${rowNumber}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
      }
    }

    // Finalize job
    const finalStatus = failCount === rows.length ? 'failed' : 'completed';
    await supabase
      .from('import_jobs')
      .update({ 
        status: finalStatus,
        processed_rows: rows.length,
        successful_rows: successCount,
        failed_rows: failCount,
        error_message: errors.length > 0 ? errors.slice(0, 10).join('\n') : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log('[import-csv] Import complete:', successCount, 'success,', failCount, 'failed');

    return new Response(
      JSON.stringify({ 
        success: true,
        totalRows: rows.length,
        successCount,
        failCount,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[import-csv] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
