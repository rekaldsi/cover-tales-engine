-- Enable realtime for collection_snapshots and comic_value_history tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comic_value_history;