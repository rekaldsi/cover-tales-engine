-- Phase 0: Create integration_runs table for observability
CREATE TABLE public.integration_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  comic_id UUID,
  request_id TEXT,
  function TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'error', 'partial')),
  latency_ms INTEGER,
  http_status INTEGER,
  error_code TEXT,
  error_message TEXT,
  summary JSONB
);

-- Enable RLS
ALTER TABLE public.integration_runs ENABLE ROW LEVEL SECURITY;

-- Users can view their own integration runs
CREATE POLICY "Users can view their own integration runs"
ON public.integration_runs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own integration runs
CREATE POLICY "Users can insert their own integration runs"
ON public.integration_runs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Service role can insert any runs (for edge functions)
CREATE POLICY "Service role can insert integration runs"
ON public.integration_runs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_integration_runs_user_created ON public.integration_runs(user_id, created_at DESC);
CREATE INDEX idx_integration_runs_function ON public.integration_runs(function);
CREATE INDEX idx_integration_runs_provider ON public.integration_runs(provider);
CREATE INDEX idx_integration_runs_status ON public.integration_runs(status);