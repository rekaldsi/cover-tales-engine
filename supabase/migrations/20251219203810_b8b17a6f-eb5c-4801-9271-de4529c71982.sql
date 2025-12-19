-- Add copy_number field to track individual copies of the same issue
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS copy_number integer DEFAULT 1;