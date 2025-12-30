import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'complete';

export interface ColumnMapping {
  csvColumn: string;
  comicField: string | null;
  confidence: number;
  sampleValues: string[];
}

export interface ImportJob {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  detectedColumns: string[];
  columnMapping: ColumnMapping[] | null;
}

export function useCSVImport() {
  const { user } = useAuth();
  const [step, setStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Parse rows
    const dataRows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      dataRows.push(row);
    }

    return { headers, rows: dataRows };
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (!user) {
      toast.error('Please sign in to import comics');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const { headers, rows: parsedRows } = parseCSV(text);

      if (headers.length === 0) {
        throw new Error('No columns detected in CSV file');
      }

      if (parsedRows.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      // Create import job record
      const { data: jobData, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          user_id: user.id,
          filename: file.name,
          status: 'analyzing',
          total_rows: parsedRows.length,
          detected_columns: headers,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setJob({
        id: jobData.id,
        filename: jobData.filename,
        status: jobData.status,
        totalRows: jobData.total_rows,
        processedRows: 0,
        successfulRows: 0,
        failedRows: 0,
        detectedColumns: headers,
        columnMapping: null,
      });

      setRows(parsedRows);
      setStep('preview');
      toast.success(`Loaded ${parsedRows.length} rows from ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse CSV file';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, parseCSV]);

  const analyzeColumns = useCallback(async () => {
    if (!job || rows.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const sampleRows = rows.slice(0, 5);

      const { data, error: fnError } = await supabase.functions.invoke('analyze-csv', {
        body: {
          columns: job.detectedColumns,
          sampleRows,
          jobId: job.id,
        },
      });

      if (fnError) throw fnError;

      if (!data.success) {
        throw new Error('Failed to analyze columns');
      }

      setMappings(data.mappings);
      setStep('mapping');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze columns';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [job, rows]);

  const updateMapping = useCallback((csvColumn: string, comicField: string | null) => {
    setMappings(prev => 
      prev.map(m => 
        m.csvColumn === csvColumn 
          ? { ...m, comicField, confidence: comicField ? 100 : 0 }
          : m
      )
    );
  }, []);

  const startImport = useCallback(async () => {
    if (!job || !user) return;

    setIsLoading(true);
    setError(null);
    setStep('importing');

    try {
      // Update job status
      await supabase
        .from('import_jobs')
        .update({ 
          status: 'importing',
          column_mapping: JSON.parse(JSON.stringify(mappings)),
        })
        .eq('id', job.id);

      const { data, error: fnError } = await supabase.functions.invoke('import-csv', {
        body: {
          jobId: job.id,
          rows,
          mappings,
          userId: user.id,
        },
      });

      if (fnError) throw fnError;

      setJob(prev => prev ? {
        ...prev,
        status: 'complete',
        processedRows: data.processed,
        successfulRows: data.successful,
        failedRows: data.failed,
      } : null);

      setStep('complete');
      toast.success(`Imported ${data.successful} comics successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import comics';
      setError(message);
      toast.error(message);
      
      // Update job status to failed
      await supabase
        .from('import_jobs')
        .update({ status: 'failed', error_message: message })
        .eq('id', job.id);
    } finally {
      setIsLoading(false);
    }
  }, [job, user, rows, mappings]);

  const reset = useCallback(() => {
    setStep('upload');
    setJob(null);
    setRows([]);
    setMappings([]);
    setError(null);
  }, []);

  return {
    step,
    setStep,
    isLoading,
    job,
    rows,
    mappings,
    error,
    uploadFile,
    analyzeColumns,
    updateMapping,
    startImport,
    reset,
  };
}
