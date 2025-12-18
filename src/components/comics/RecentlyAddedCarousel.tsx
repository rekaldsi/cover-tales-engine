import { Comic } from '@/types/comic';
import { ComicCard } from './ComicCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

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
      <div className="text-center py-12 text-muted-foreground">
        <p>No comics in your collection yet.</p>
        <p className="text-sm mt-1">Add your first comic to get started!</p>
      </div>
    );
  }
  
  return (
    <div className="relative group">
      {/* Navigation Buttons */}
      <Button
        variant="glass"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Button
        variant="glass"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      {/* Carousel */}
      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {comics.map((comic, index) => (
          <div 
            key={comic.id} 
            className="flex-shrink-0 w-[200px] sm:w-[220px] snap-start animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <ComicCard comic={comic} onClick={() => onComicClick(comic)} />
          </div>
        ))}
      </div>
    </div>
  );
}
