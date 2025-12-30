-- Create verification_results table for future verification provider integration
CREATE TABLE public.verification_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'ximilar', 'gcd', 'manual', etc.
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence NUMERIC,
  match_score NUMERIC,
  matched_issue JSONB, -- Matched comic metadata from provider
  raw_response JSONB, -- Full provider response for debugging
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'mismatch', 'error'
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see verification results for their own comics
CREATE POLICY "Users can view their own verification results" 
ON public.verification_results 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM comics WHERE comics.id = verification_results.comic_id AND comics.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own verification results" 
ON public.verification_results 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM comics WHERE comics.id = verification_results.comic_id AND comics.user_id = auth.uid()
));

CREATE POLICY "Users can update their own verification results" 
ON public.verification_results 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM comics WHERE comics.id = verification_results.comic_id AND comics.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own verification results" 
ON public.verification_results 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM comics WHERE comics.id = verification_results.comic_id AND comics.user_id = auth.uid()
));