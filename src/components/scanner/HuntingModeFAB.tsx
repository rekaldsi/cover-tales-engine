import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HuntingModeFABProps {
  onClick: () => void;
}

export function HuntingModeFAB({ onClick }: HuntingModeFABProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/25 md:bottom-6 md:right-6"
      aria-label="Open Hunting Mode"
    >
      <Target className="h-6 w-6" />
    </Button>
  );
}
