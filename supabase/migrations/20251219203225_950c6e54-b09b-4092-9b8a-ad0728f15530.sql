-- Add AI condition analysis fields for raw comics
ALTER TABLE public.comics 
ADD COLUMN IF NOT EXISTS estimated_raw_grade TEXT,
ADD COLUMN IF NOT EXISTS condition_notes TEXT,
ADD COLUMN IF NOT EXISTS visible_defects TEXT[],
ADD COLUMN IF NOT EXISTS condition_confidence TEXT;