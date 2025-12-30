-- Phase 2: Pricing System Tables

-- Table to track provider health and status
CREATE TABLE public.pricing_providers (
  provider TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  method TEXT NOT NULL,
  last_ok_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_rate_24h NUMERIC DEFAULT 0,
  notes TEXT
);

-- Insert known providers
INSERT INTO public.pricing_providers (provider, method, notes) VALUES
  ('gocollect', 'api', 'Primary graded value source'),
  ('ebay_sold', 'scrape', 'Sold comps via Firecrawl'),
  ('covrprice', 'scrape', 'Secondary value source'),
  ('gpa', 'scrape', 'GPA Analytics fallback'),
  ('overstreet', 'manual', 'Overstreet Price Guide reference'),
  ('cpg', 'api', 'Comics Price Guide API');

-- Enable RLS on pricing_providers (public read, admin write)
ALTER TABLE public.pricing_providers ENABLE ROW LEVEL SECURITY;

-- Anyone can read provider status
CREATE POLICY "Anyone can view pricing providers"
  ON public.pricing_providers
  FOR SELECT
  USING (true);

-- Table to store per-provider pricing results
CREATE TABLE public.comic_value_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  grade_context TEXT,
  value NUMERIC,
  range_low NUMERIC,
  range_high NUMERIC,
  confidence INTEGER DEFAULT 50,
  comps JSONB,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,
  error_reason TEXT,
  UNIQUE(comic_id, provider, grade_context)
);

-- Enable RLS
ALTER TABLE public.comic_value_sources ENABLE ROW LEVEL SECURITY;

-- Users can view value sources for their own comics
CREATE POLICY "Users can view their own comic value sources"
  ON public.comic_value_sources
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.comics
    WHERE comics.id = comic_value_sources.comic_id
    AND comics.user_id = auth.uid()
  ));

-- Users can insert value sources for their own comics
CREATE POLICY "Users can insert their own comic value sources"
  ON public.comic_value_sources
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.comics
    WHERE comics.id = comic_value_sources.comic_id
    AND comics.user_id = auth.uid()
  ));

-- Users can update value sources for their own comics
CREATE POLICY "Users can update their own comic value sources"
  ON public.comic_value_sources
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.comics
    WHERE comics.id = comic_value_sources.comic_id
    AND comics.user_id = auth.uid()
  ));

-- Users can delete value sources for their own comics
CREATE POLICY "Users can delete their own comic value sources"
  ON public.comic_value_sources
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.comics
    WHERE comics.id = comic_value_sources.comic_id
    AND comics.user_id = auth.uid()
  ));

-- Create index for faster lookups
CREATE INDEX idx_comic_value_sources_comic_id ON public.comic_value_sources(comic_id);
CREATE INDEX idx_comic_value_sources_provider ON public.comic_value_sources(provider);
CREATE INDEX idx_comic_value_sources_fetched_at ON public.comic_value_sources(fetched_at DESC);

-- Create a function to update provider health from integration_runs
CREATE OR REPLACE FUNCTION public.update_provider_health()
RETURNS TRIGGER AS $$
BEGIN
  -- Update pricing provider stats based on integration run
  IF NEW.provider IS NOT NULL THEN
    UPDATE public.pricing_providers
    SET 
      last_ok_at = CASE WHEN NEW.status = 'ok' THEN NEW.created_at ELSE last_ok_at END,
      last_error_at = CASE WHEN NEW.status != 'ok' THEN NEW.created_at ELSE last_error_at END
    WHERE provider = NEW.provider;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-update provider health
CREATE TRIGGER trigger_update_provider_health
  AFTER INSERT ON public.integration_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_health();