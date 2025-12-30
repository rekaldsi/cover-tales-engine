import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Event {
  id: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  websiteUrl: string | null;
  eventType: string;
  notes: string | null;
  createdAt: string;
}

export interface EventGuest {
  id: string;
  eventId: string;
  guestName: string;
  guestRole: string | null;
  boothInfo: string | null;
  signingFee: string | null;
  confidence: number | null;
  source: string | null;
  notes: string | null;
}

export interface SigningRecommendation {
  id: string;
  eventId: string;
  comicId: string;
  guestId: string | null;
  matchReason: string;
  priorityScore: number | null;
  currentValue: number | null;
  estimatedSignedValue: number | null;
  valueUpliftPercent: number | null;
  status: string | null;
  notes: string | null;
  comic?: {
    title: string;
    issueNumber: string | null;
    coverImageUrl: string | null;
    isKeyIssue: boolean | null;
    writer: string | null;
    artist: string | null;
    coverArtist: string | null;
  };
  guest?: {
    guestName: string;
    guestRole: string | null;
  };
}

export function useSigningRecommendations() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [recommendations, setRecommendations] = useState<SigningRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingGuests, setIsFetchingGuests] = useState(false);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      setEvents(data.map(e => ({
        id: e.id,
        name: e.name,
        location: e.location,
        startDate: e.start_date,
        endDate: e.end_date,
        websiteUrl: e.website_url,
        eventType: e.event_type,
        notes: e.notes,
        createdAt: e.created_at,
      })));
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch guests for selected event
  const fetchGuests = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_guests')
        .select('*')
        .eq('event_id', eventId)
        .order('guest_name');

      if (error) throw error;

      setGuests(data.map(g => ({
        id: g.id,
        eventId: g.event_id,
        guestName: g.guest_name,
        guestRole: g.guest_role,
        boothInfo: g.booth_info,
        signingFee: g.signing_fee,
        confidence: g.confidence,
        source: g.source,
        notes: g.notes,
      })));
    } catch (err) {
      console.error('Error fetching guests:', err);
    }
  }, [user]);

  // Fetch recommendations for selected event
  const fetchRecommendations = useCallback(async (eventId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('signing_recommendations')
        .select(`
          *,
          comics (
            title,
            issue_number,
            cover_image_url,
            is_key_issue,
            writer,
            artist,
            cover_artist
          ),
          event_guests (
            guest_name,
            guest_role
          )
        `)
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .order('priority_score', { ascending: false });

      if (error) throw error;

      setRecommendations(data.map(r => ({
        id: r.id,
        eventId: r.event_id,
        comicId: r.comic_id,
        guestId: r.guest_id,
        matchReason: r.match_reason,
        priorityScore: r.priority_score,
        currentValue: r.current_value,
        estimatedSignedValue: r.estimated_signed_value,
        valueUpliftPercent: r.value_uplift_percent,
        status: r.status,
        notes: r.notes,
        comic: r.comics ? {
          title: r.comics.title,
          issueNumber: r.comics.issue_number,
          coverImageUrl: r.comics.cover_image_url,
          isKeyIssue: r.comics.is_key_issue,
          writer: r.comics.writer,
          artist: r.comics.artist,
          coverArtist: r.comics.cover_artist,
        } : undefined,
        guest: r.event_guests ? {
          guestName: r.event_guests.guest_name,
          guestRole: r.event_guests.guest_role,
        } : undefined,
      })));
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  }, [user]);

  // Select event and fetch related data
  const selectEvent = useCallback(async (event: Event | null) => {
    setSelectedEvent(event);
    if (event) {
      await Promise.all([
        fetchGuests(event.id),
        fetchRecommendations(event.id),
      ]);
    } else {
      setGuests([]);
      setRecommendations([]);
    }
  }, [fetchGuests, fetchRecommendations]);

  // Create event
  const createEvent = useCallback(async (eventData: Omit<Event, 'id' | 'createdAt'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          name: eventData.name,
          location: eventData.location,
          start_date: eventData.startDate,
          end_date: eventData.endDate,
          website_url: eventData.websiteUrl,
          event_type: eventData.eventType,
          notes: eventData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      const newEvent: Event = {
        id: data.id,
        name: data.name,
        location: data.location,
        startDate: data.start_date,
        endDate: data.end_date,
        websiteUrl: data.website_url,
        eventType: data.event_type,
        notes: data.notes,
        createdAt: data.created_at,
      };

      setEvents(prev => [...prev, newEvent]);
      toast.success('Event created');
      return newEvent;
    } catch (err) {
      console.error('Error creating event:', err);
      toast.error('Failed to create event');
      return null;
    }
  }, [user]);

  // Delete event
  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      setEvents(prev => prev.filter(e => e.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setGuests([]);
        setRecommendations([]);
      }
      toast.success('Event deleted');
    } catch (err) {
      console.error('Error deleting event:', err);
      toast.error('Failed to delete event');
    }
  }, [selectedEvent]);

  // Fetch guests from convention website
  const scrapeConventionGuests = useCallback(async (eventId: string, websiteUrl?: string) => {
    if (!user) return;

    setIsFetchingGuests(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-convention-guests', {
        body: {
          eventId,
          websiteUrl,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast.success(`Found ${data.guestCount} guests`);
      
      // Refresh guests and recommendations
      await Promise.all([
        fetchGuests(eventId),
        fetchRecommendations(eventId),
      ]);
    } catch (err) {
      console.error('Error scraping guests:', err);
      toast.error('Failed to fetch guest list');
    } finally {
      setIsFetchingGuests(false);
    }
  }, [user, fetchGuests, fetchRecommendations]);

  // Add manual guest
  const addGuest = useCallback(async (eventId: string, guestData: { guestName: string; guestRole?: string }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_guests')
        .insert({
          event_id: eventId,
          guest_name: guestData.guestName,
          guest_role: guestData.guestRole || null,
          source: 'manual',
          confidence: 100,
        })
        .select()
        .single();

      if (error) throw error;

      const newGuest: EventGuest = {
        id: data.id,
        eventId: data.event_id,
        guestName: data.guest_name,
        guestRole: data.guest_role,
        boothInfo: data.booth_info,
        signingFee: data.signing_fee,
        confidence: data.confidence,
        source: data.source,
        notes: data.notes,
      };

      setGuests(prev => [...prev, newGuest]);
      toast.success('Guest added');

      // Regenerate recommendations
      await supabase.functions.invoke('fetch-convention-guests', {
        body: {
          eventId,
          manualGuests: [{ name: guestData.guestName, role: guestData.guestRole }],
          userId: user.id,
        },
      });
      await fetchRecommendations(eventId);
    } catch (err) {
      console.error('Error adding guest:', err);
      toast.error('Failed to add guest');
    }
  }, [user, fetchRecommendations]);

  // Remove guest
  const removeGuest = useCallback(async (guestId: string) => {
    try {
      const { error } = await supabase
        .from('event_guests')
        .delete()
        .eq('id', guestId);

      if (error) throw error;

      setGuests(prev => prev.filter(g => g.id !== guestId));
      toast.success('Guest removed');
    } catch (err) {
      console.error('Error removing guest:', err);
      toast.error('Failed to remove guest');
    }
  }, []);

  // Update recommendation status
  const updateRecommendationStatus = useCallback(async (recId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('signing_recommendations')
        .update({ status })
        .eq('id', recId);

      if (error) throw error;

      setRecommendations(prev => 
        prev.map(r => r.id === recId ? { ...r, status } : r)
      );
    } catch (err) {
      console.error('Error updating recommendation:', err);
      toast.error('Failed to update');
    }
  }, []);

  return {
    events,
    selectedEvent,
    guests,
    recommendations,
    isLoading,
    isFetchingGuests,
    fetchEvents,
    selectEvent,
    createEvent,
    deleteEvent,
    scrapeConventionGuests,
    addGuest,
    removeGuest,
    updateRecommendationStatus,
  };
}
