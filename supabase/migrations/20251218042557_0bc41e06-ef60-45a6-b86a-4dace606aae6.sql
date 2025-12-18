-- Create comics table with all required fields
CREATE TABLE public.comics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Basic Info
  title TEXT NOT NULL,
  issue_number TEXT,
  volume TEXT,
  cover_date DATE,
  publisher TEXT,
  variant_type TEXT,
  print_number INTEGER DEFAULT 1,
  
  -- Cover Image (URL only - never store user photos)
  cover_image_url TEXT,
  
  -- Categorization
  era TEXT CHECK (era IN ('golden', 'silver', 'bronze', 'copper', 'modern', 'current')),
  
  -- Creators
  writer TEXT,
  artist TEXT,
  cover_artist TEXT,
  
  -- Grading Info
  grade_status TEXT CHECK (grade_status IN ('raw', 'cgc', 'cbcs', 'pgx')) DEFAULT 'raw',
  grade DECIMAL(3,1),
  cert_number TEXT,
  label_type TEXT,
  grader_notes TEXT,
  
  -- Key Issue
  is_key_issue BOOLEAN DEFAULT false,
  key_issue_reason TEXT,
  
  -- Value Tracking
  purchase_price DECIMAL(10,2),
  purchase_date DATE,
  current_value DECIMAL(10,2),
  
  -- Collection Organization
  location TEXT,
  notes TEXT,
  
  -- Metadata
  comicvine_id TEXT,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Each user can only access their own comics
CREATE POLICY "Users can view their own comics" 
ON public.comics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comics" 
ON public.comics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comics" 
ON public.comics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comics" 
ON public.comics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_comics_updated_at
BEFORE UPDATE ON public.comics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_comics_user_id ON public.comics(user_id);
CREATE INDEX idx_comics_title ON public.comics(title);
CREATE INDEX idx_comics_era ON public.comics(era);
CREATE INDEX idx_comics_publisher ON public.comics(publisher);