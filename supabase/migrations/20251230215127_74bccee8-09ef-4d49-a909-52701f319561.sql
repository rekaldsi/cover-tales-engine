-- Phase 1: Create normalized comic_creators table
CREATE TABLE public.comic_creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id UUID NOT NULL REFERENCES comics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('writer', 'artist', 'cover_artist', 'inker', 'colorist', 'letterer', 'editor')),
  source TEXT NOT NULL CHECK (source IN ('comicvine', 'metron', 'manual', 'mixed')),
  confidence INTEGER DEFAULT 100 CHECK (confidence >= 0 AND confidence <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comic_creators ENABLE ROW LEVEL SECURITY;

-- Users can view creators for their own comics
CREATE POLICY "Users can view their own comic creators"
ON public.comic_creators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM comics 
    WHERE comics.id = comic_creators.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Users can insert creators for their own comics
CREATE POLICY "Users can insert their own comic creators"
ON public.comic_creators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM comics 
    WHERE comics.id = comic_creators.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Users can update creators for their own comics
CREATE POLICY "Users can update their own comic creators"
ON public.comic_creators
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM comics 
    WHERE comics.id = comic_creators.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Users can delete creators for their own comics
CREATE POLICY "Users can delete their own comic creators"
ON public.comic_creators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM comics 
    WHERE comics.id = comic_creators.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_comic_creators_comic_id ON public.comic_creators(comic_id);
CREATE INDEX idx_comic_creators_name ON public.comic_creators(name);
CREATE INDEX idx_comic_creators_role ON public.comic_creators(role);

-- Add credits_source to comics table
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS credits_source TEXT DEFAULT 'none' CHECK (credits_source IN ('comicvine', 'metron', 'mixed', 'manual', 'none'));

-- Add confidence_score to comics table for value confidence  
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Add value_range columns to comics table
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS value_range_low NUMERIC;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS value_range_high NUMERIC;