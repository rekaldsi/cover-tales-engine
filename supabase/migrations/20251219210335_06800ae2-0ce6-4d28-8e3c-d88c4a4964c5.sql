-- Add signatures JSONB column for multiple signatures support
ALTER TABLE public.comics 
ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.comics.signatures IS 'Array of signature objects with signedBy, signedDate, signatureType, and verificationNotes';