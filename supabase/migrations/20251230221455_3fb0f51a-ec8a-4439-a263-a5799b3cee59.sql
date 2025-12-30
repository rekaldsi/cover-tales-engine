-- Create import_jobs table to track CSV import jobs
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'analyzing', 'mapped', 'importing', 'completed', 'failed'
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  successful_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB, -- Mapping of CSV columns to comic fields
  detected_columns TEXT[], -- Original column names from CSV
  error_message TEXT
);

-- Create import_rows table for individual row tracking
CREATE TABLE public.import_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL, -- Original CSV row data
  parsed_data JSONB, -- Parsed comic data after mapping
  comic_id UUID REFERENCES public.comics(id) ON DELETE SET NULL, -- Created/matched comic
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'success', 'error', 'skipped'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_jobs
CREATE POLICY "Users can view their own import jobs" 
ON public.import_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import jobs" 
ON public.import_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs" 
ON public.import_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import jobs" 
ON public.import_jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for import_rows - through job ownership
CREATE POLICY "Users can view their own import rows" 
ON public.import_rows 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM import_jobs WHERE import_jobs.id = import_rows.import_job_id AND import_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own import rows" 
ON public.import_rows 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM import_jobs WHERE import_jobs.id = import_rows.import_job_id AND import_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can update their own import rows" 
ON public.import_rows 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM import_jobs WHERE import_jobs.id = import_rows.import_job_id AND import_jobs.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own import rows" 
ON public.import_rows 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM import_jobs WHERE import_jobs.id = import_rows.import_job_id AND import_jobs.user_id = auth.uid()
));

-- Index for efficient job lookups
CREATE INDEX idx_import_rows_job_id ON public.import_rows(import_job_id);
CREATE INDEX idx_import_jobs_user_status ON public.import_jobs(user_id, status);