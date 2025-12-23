-- Create comic_value_history table for stock-like tracking
CREATE TABLE public.comic_value_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  value DECIMAL(10,2) NOT NULL,
  source TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_comic_value_history_comic_id ON public.comic_value_history(comic_id);
CREATE INDEX idx_comic_value_history_recorded_at ON public.comic_value_history(recorded_at DESC);

-- Enable RLS
ALTER TABLE public.comic_value_history ENABLE ROW LEVEL SECURITY;

-- Users can view value history for their own comics
CREATE POLICY "Users can view their own comic value history"
ON public.comic_value_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.comics 
    WHERE comics.id = comic_value_history.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Users can insert value history for their own comics
CREATE POLICY "Users can insert their own comic value history"
ON public.comic_value_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.comics 
    WHERE comics.id = comic_value_history.comic_id 
    AND comics.user_id = auth.uid()
  )
);

-- Add unique constraint for daily snapshots per comic
ALTER TABLE public.collection_snapshots
ADD CONSTRAINT collection_snapshots_user_date_unique UNIQUE (user_id, snapshot_date);