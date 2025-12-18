-- Add signature tracking columns
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_signed boolean DEFAULT false;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS signed_by text;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS signed_date date;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS signature_type text;

-- Add character and media tracking columns
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS first_appearance_of text;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS characters text[];
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS media_tie_in text;

-- Add index for signed comics lookup
CREATE INDEX IF NOT EXISTS idx_comics_is_signed ON public.comics(is_signed) WHERE is_signed = true;

-- Add index for first appearances
CREATE INDEX IF NOT EXISTS idx_comics_first_appearance ON public.comics(first_appearance_of) WHERE first_appearance_of IS NOT NULL;