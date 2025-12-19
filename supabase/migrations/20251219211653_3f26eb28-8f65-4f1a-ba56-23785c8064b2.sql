-- Add new fields for enhanced comic data
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS story_arc TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS upc_code TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS cover_price TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS colorist TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS inker TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS letterer TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS editor TEXT;