import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OwnedBadgeProps {
  isOwned: boolean;
  copyCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Ownership status badge for hunting mode
 * Shows whether comic is already in collection
 */
export function OwnedBadge({
  isOwned,
  copyCount = 1,
  size = 'md',
}: OwnedBadgeProps) {
  const sizeConfig = {
    sm: {
      text: 'text-xs',
      padding: 'px-2 py-0.5',
      icon: 'w-3 h-3',
    },
    md: {
      text: 'text-sm',
      padding: 'px-3 py-1',
      icon: 'w-4 h-4',
    },
    lg: {
      text: 'text-base',
      padding: 'px-4 py-1.5',
      icon: 'w-5 h-5',
    },
  };

  const config = sizeConfig[size];

  if (isOwned) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold',
          'bg-green-500 text-white',
          config.padding,
          config.text
        )}
      >
        <Check className={config.icon} />
        <span>OWNED{copyCount > 1 ? ` x${copyCount}` : ''}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        'bg-muted text-muted-foreground',
        config.padding,
        config.text
      )}
    >
      <X className={config.icon} />
      <span>Missing</span>
    </div>
  );
}
