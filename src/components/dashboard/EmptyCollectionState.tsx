import { Library, Plus, Scan, Target, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyCollectionStateProps {
  onAddClick: () => void;
  onHuntingClick?: () => void;
}

export function EmptyCollectionState({ onAddClick, onHuntingClick }: EmptyCollectionStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Library className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <Plus className="w-4 h-4 text-accent-foreground" />
        </div>
      </div>
      
      <h2 className="font-display text-3xl mb-2">Start Your Collection</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Add your first comic to begin tracking your collection's value, key issues, and grading details.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          size="lg" 
          onClick={onAddClick}
          className="gap-2"
        >
          <Scan className="w-5 h-5" />
          Scan to Add
        </Button>
        {onHuntingClick && (
          <Button 
            size="lg" 
            variant="outline"
            onClick={onHuntingClick}
            className="gap-2"
          >
            <Target className="w-5 h-5" />
            Hunting Mode
          </Button>
        )}
      </div>
      
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
        <FeatureCard
          icon={Scan}
          title="Scan Barcodes"
          description="Quickly add comics by scanning their barcode"
        />
        <FeatureCard
          icon={Star}
          title="Key Issue Lookup"
          description="Instantly check if a comic is valuable"
        />
        <FeatureCard
          icon={Library}
          title="Track Value"
          description="Monitor your collection's worth over time"
        />
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border/50 text-center">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
