import { useState } from 'react';
import { useSigningRecommendations, Event } from '@/hooks/useSigningRecommendations';
import { EventCard } from './EventCard';
import { BringList } from './BringList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, CalendarPlus, Loader2, Globe, UserPlus, X, 
  Users, ArrowLeft, Sparkles 
} from 'lucide-react';

export function ConventionMode() {
  const {
    events,
    selectedEvent,
    guests,
    recommendations,
    isLoading,
    isFetchingGuests,
    selectEvent,
    createEvent,
    deleteEvent,
    scrapeConventionGuests,
    addGuest,
    removeGuest,
    updateRecommendationStatus,
  } = useSigningRecommendations();

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    websiteUrl: '',
    eventType: 'convention',
    notes: '',
  });
  const [newGuest, setNewGuest] = useState({ guestName: '', guestRole: '' });

  const handleCreateEvent = async () => {
    if (!newEvent.name.trim()) return;
    
    const event = await createEvent({
      name: newEvent.name,
      location: newEvent.location || null,
      startDate: newEvent.startDate || null,
      endDate: newEvent.endDate || null,
      websiteUrl: newEvent.websiteUrl || null,
      eventType: newEvent.eventType,
      notes: newEvent.notes || null,
    });

    if (event) {
      setShowAddEvent(false);
      setNewEvent({
        name: '',
        location: '',
        startDate: '',
        endDate: '',
        websiteUrl: '',
        eventType: 'convention',
        notes: '',
      });
      selectEvent(event);
    }
  };

  const handleAddGuest = async () => {
    if (!selectedEvent || !newGuest.guestName.trim()) return;
    
    await addGuest(selectedEvent.id, {
      guestName: newGuest.guestName,
      guestRole: newGuest.guestRole || undefined,
    });
    
    setShowAddGuest(false);
    setNewGuest({ guestName: '', guestRole: '' });
  };

  const handleScrapeGuests = async () => {
    if (!selectedEvent) return;
    await scrapeConventionGuests(selectedEvent.id, selectedEvent.websiteUrl || undefined);
  };

  // Event List View
  if (!selectedEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">My Events</h2>
            <p className="text-sm text-muted-foreground">
              Plan signings for conventions and events
            </p>
          </div>
          
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <CalendarPlus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., San Diego Comic-Con 2024"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., San Diego Convention Center"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL (for guest scraping)</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://..."
                    value={newEvent.websiteUrl}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateEvent} className="w-full" disabled={!newEvent.name.trim()}>
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CalendarPlus className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-display mb-2">No Events Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Add a convention or signing event to start planning which comics to bring.
            </p>
            <Button onClick={() => setShowAddEvent(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                guestCount={0}
                onSelect={() => selectEvent(event)}
                onDelete={() => setEventToDelete(event.id)}
              />
            ))}
          </div>
        )}

        <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the event and all associated guests and recommendations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() => {
                  if (eventToDelete) deleteEvent(eventToDelete);
                  setEventToDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Event Detail View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => selectEvent(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-display text-2xl">{selectedEvent.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedEvent.location || 'Location TBD'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Guests Panel */}
        <div className="stat-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Guests ({guests.length})
            </h3>
            <div className="flex gap-2">
              {selectedEvent.websiteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScrapeGuests}
                  disabled={isFetchingGuests}
                >
                  {isFetchingGuests ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Auto-Detect
                    </>
                  )}
                </Button>
              )}
              <Dialog open={showAddGuest} onOpenChange={setShowAddGuest}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Guest</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Guest Name *</Label>
                      <Input
                        placeholder="e.g., Jim Lee"
                        value={newGuest.guestName}
                        onChange={(e) => setNewGuest(prev => ({ ...prev, guestName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input
                        placeholder="e.g., Artist, Writer"
                        value={newGuest.guestRole}
                        onChange={(e) => setNewGuest(prev => ({ ...prev, guestRole: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleAddGuest} className="w-full" disabled={!newGuest.guestName.trim()}>
                      Add Guest
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {guests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No guests added yet</p>
              {selectedEvent.websiteUrl && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2"
                  onClick={handleScrapeGuests}
                  disabled={isFetchingGuests}
                >
                  Try auto-detecting from website
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {guests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                  >
                    <div>
                      <p className="font-medium">{guest.guestName}</p>
                      {guest.guestRole && (
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {guest.guestRole}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeGuest(guest.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Bring List Panel */}
        <div className="stat-card p-6">
          <h3 className="font-display text-lg mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Bring List
          </h3>
          <BringList 
            recommendations={recommendations} 
            onUpdateStatus={updateRecommendationStatus}
          />
        </div>
      </div>
    </div>
  );
}
