-- Create collection_snapshots table for portfolio value tracking
CREATE TABLE public.collection_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_value numeric NOT NULL DEFAULT 0,
  comic_count integer NOT NULL DEFAULT 0,
  graded_count integer NOT NULL DEFAULT 0,
  key_issue_count integer NOT NULL DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.collection_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can only view their own snapshots
CREATE POLICY "Users can view their own snapshots"
ON public.collection_snapshots
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own snapshots
CREATE POLICY "Users can insert their own snapshots"
ON public.collection_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own snapshots (for same-day updates)
CREATE POLICY "Users can update their own snapshots"
ON public.collection_snapshots
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_snapshots_user_date ON public.collection_snapshots(user_id, snapshot_date DESC);