-- Add new grading detail columns
ALTER TABLE public.comics
ADD COLUMN IF NOT EXISTS page_quality text,
ADD COLUMN IF NOT EXISTS graded_date date,
ADD COLUMN IF NOT EXISTS inner_well_notes text;