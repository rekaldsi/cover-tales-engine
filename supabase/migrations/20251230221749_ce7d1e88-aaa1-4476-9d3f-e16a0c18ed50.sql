-- Create events table for conventions and signing events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'convention', -- 'convention', 'signing', 'show'
  location TEXT,
  start_date DATE,
  end_date DATE,
  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_guests table for normalized guest list
CREATE TABLE public.event_guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_role TEXT, -- 'writer', 'artist', 'creator', 'actor', etc.
  booth_info TEXT,
  signing_fee TEXT,
  notes TEXT,
  source TEXT, -- 'scraped', 'manual', 'api'
  confidence INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signing_recommendations table for matched comics
CREATE TABLE public.signing_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.event_guests(id) ON DELETE SET NULL,
  match_reason TEXT NOT NULL, -- 'writer', 'artist', 'cover_artist', 'creator'
  priority_score INTEGER DEFAULT 50, -- 0-100 based on value uplift potential
  current_value NUMERIC,
  estimated_signed_value NUMERIC,
  value_uplift_percent NUMERIC,
  status TEXT DEFAULT 'pending', -- 'pending', 'queued', 'signed', 'skipped'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signing_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for events
CREATE POLICY "Users can view their own events" 
ON public.events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.events FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for event_guests - through event ownership
CREATE POLICY "Users can view guests for their events" 
ON public.event_guests FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM events WHERE events.id = event_guests.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Users can add guests to their events" 
ON public.event_guests FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM events WHERE events.id = event_guests.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Users can update guests for their events" 
ON public.event_guests FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM events WHERE events.id = event_guests.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Users can delete guests from their events" 
ON public.event_guests FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM events WHERE events.id = event_guests.event_id AND events.user_id = auth.uid()
));

-- RLS policies for signing_recommendations
CREATE POLICY "Users can view their own recommendations" 
ON public.signing_recommendations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recommendations" 
ON public.signing_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" 
ON public.signing_recommendations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations" 
ON public.signing_recommendations FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_event_guests_event ON public.event_guests(event_id);
CREATE INDEX idx_signing_recs_event ON public.signing_recommendations(event_id);
CREATE INDEX idx_signing_recs_comic ON public.signing_recommendations(comic_id);
CREATE INDEX idx_signing_recs_user ON public.signing_recommendations(user_id);