import { ReactNode } from 'react';
import Masonry from 'react-masonry-css';
import { cn } from '@/lib/utils';

interface MasonryGridProps {
  children: ReactNode;
  className?: string;
  columnClassName?: string;
  breakpointCols?: {
    default: number;
    [key: number]: number;
  };
}

/**
 * Masonry grid layout component for visually dynamic card displays
 * Provides Pinterest-style layout with varying heights for more visual interest
 *
 * @param children - Grid items (typically ComicCard components)
 * @param className - Container class name
 * @param columnClassName - Individual column class name
 * @param breakpointCols - Responsive column configuration (defaults to 2-6 columns)
 */
export function MasonryGrid({
  children,
  className,
  columnClassName,
  breakpointCols = {
    default: 6,  // xl+ screens
    1536: 6,     // 2xl
    1280: 5,     // xl
    1024: 4,     // lg
    768: 3,      // md
    640: 2,      // sm
    0: 2,        // mobile
  },
}: MasonryGridProps) {
  return (
    <Masonry
      breakpointCols={breakpointCols}
      className={cn(
        'flex -ml-4 w-auto',
        'transition-all duration-300 ease-out',
        className
      )}
      columnClassName={cn(
        'pl-4 bg-clip-padding',
        'masonry-grid-column',
        columnClassName
      )}
    >
      {children}
    </Masonry>
  );
}

// Additional styles for smooth transitions (add to index.css)
export const masonryStyles = `
.masonry-grid-column > * {
  margin-bottom: 1rem;
}

.masonry-grid-column {
  /* Smooth transitions when items move */
}

/* Stagger animation for initial load */
.masonry-grid-column > *:nth-child(1) { animation-delay: 0ms; }
.masonry-grid-column > *:nth-child(2) { animation-delay: 50ms; }
.masonry-grid-column > *:nth-child(3) { animation-delay: 100ms; }
.masonry-grid-column > *:nth-child(4) { animation-delay: 150ms; }
.masonry-grid-column > *:nth-child(5) { animation-delay: 200ms; }

@keyframes masonry-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.masonry-grid-column > * {
  animation: masonry-fade-in 0.3s ease-out;
  animation-fill-mode: both;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .masonry-grid-column > * {
    animation: none;
  }
}
`;
