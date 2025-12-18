import { User, Pen, Palette, Star, DollarSign } from 'lucide-react';
import { CreatorAggregate } from '@/hooks/useCreators';
import { cn } from '@/lib/utils';

interface CreatorCardProps {
  creator: CreatorAggregate;
  onClick?: () => void;
}

const roleIcons = {
  writer: Pen,
  artist: Palette,
  coverArtist: Star,
};

const roleLabels = {
  writer: 'Writer',
  artist: 'Artist',
  coverArtist: 'Cover Artist',
};

export function CreatorCard({ creator, onClick }: CreatorCardProps) {
  return (
    <button
      onClick={onClick}
      className="comic-card w-full text-left p-4 hover:border-primary/50 transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-comic-purple/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <User className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {creator.name}
          </h3>
          
          <div className="flex flex-wrap gap-1 mt-1">
            {creator.roles.map((role) => {
              const Icon = roleIcons[role];
              return (
                <span
                  key={role}
                  className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded"
                >
                  <Icon className="w-3 h-3" />
                  {roleLabels[role]}
                </span>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium text-foreground">{creator.comicCount}</span>
              comic{creator.comicCount !== 1 ? 's' : ''}
            </span>
            
            {creator.keyIssueCount > 0 && (
              <span className="flex items-center gap-1 text-accent">
                <Star className="w-3.5 h-3.5 fill-accent" />
                {creator.keyIssueCount} key
              </span>
            )}
            
            {creator.totalValue > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {creator.totalValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
