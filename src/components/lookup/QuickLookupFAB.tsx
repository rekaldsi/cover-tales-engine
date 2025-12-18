import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickLookupFABProps {
  onClick: () => void;
}

export function QuickLookupFAB({ onClick }: QuickLookupFABProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200 sm:hidden"
      aria-label="Quick Lookup"
    >
      <Search className="h-6 w-6" />
    </Button>
  );
}
