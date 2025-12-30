import { Event } from '@/hooks/useSigningRecommendations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ExternalLink, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
  guestCount?: number;
  isSelected?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function EventCard({ event, guestCount = 0, isSelected, onSelect, onDelete }: EventCardProps) {
  const formatDateRange = () => {
    if (!event.startDate) return 'Date TBD';
    const start = format(new Date(event.startDate), 'MMM d, yyyy');
    if (!event.endDate) return start;
    const end = format(new Date(event.endDate), 'MMM d, yyyy');
    return `${start} - ${end}`;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-lg truncate">{event.name}</h3>
              <Badge variant="secondary" className="text-xs capitalize">
                {event.eventType}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatDateRange()}</span>
              </div>
              
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{guestCount} guest{guestCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {event.websiteUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(event.websiteUrl!, '_blank');
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
