import { cn } from '@/lib/utils';
import { Check, BookCopy } from 'lucide-react';

interface OwnedBadgeProps {
  isOwned: boolean;
  copyCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs gap-0.5',
  md: 'px-2 py-1 text-sm gap-1',
  lg: 'px-3 py-1.5 text-base gap-1.5',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function OwnedBadge({ isOwned, copyCount = 1, size = 'md' }: OwnedBadgeProps) {
  if (!isOwned) return null;

  const showCount = copyCount > 1;

  return (
    <div
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        'bg-green-500/20 text-green-500 border border-green-500/30',
        sizeStyles[size]
      )}
    >
      {showCount ? (
        <BookCopy className={iconSizes[size]} />
      ) : (
        <Check className={iconSizes[size]} />
      )}
      <span>OWNED{showCount && ` ×${copyCount}`}</span>
    </div>
  );
}

// Inverse badge for when comic is NOT owned (missing from collection)
export function MissingBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        'bg-blue-500/20 text-blue-500 border border-blue-500/30',
        sizeStyles[size]
      )}
    >
      <span>MISSING</span>
    </div>
  );
}
