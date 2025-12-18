import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComicCard } from './ComicCard';
import type { Comic } from '@/types/comic';

interface RecentlyAddedCarouselProps {
  comics: Comic[];
  onComicClick: (comic: Comic) => void;
}

export function RecentlyAddedCarousel({ comics, onComicClick }: RecentlyAddedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (comics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comics in your collection yet. Add your first comic!
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Navigation Buttons - Always visible */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-10 py-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {comics.map((comic) => (
          <div
            key={comic.id}
            className="flex-shrink-0 w-[200px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <ComicCard comic={comic} onClick={() => onComicClick(comic)} />
          </div>
        ))}
      </div>
    </div>
  );
}