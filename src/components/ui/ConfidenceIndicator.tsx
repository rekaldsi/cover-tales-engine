import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceIndicatorProps {
  score?: number; // 0-100
  level?: 'high' | 'medium' | 'low';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getConfidenceLevel(score?: number): 'high' | 'medium' | 'low' {
  if (!score || score < 40) return 'low';
  if (score < 70) return 'medium';
  return 'high';
}

export function getConfidenceLabel(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'High Confidence';
    case 'medium': return 'Medium Confidence';
    case 'low': return 'Low Confidence';
  }
}

export function getConfidenceDescription(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'Multiple sources agree on this value';
    case 'medium': return 'Some variance between pricing sources';
    case 'low': return 'Limited data or significant source disagreement';
  }
}

export function ConfidenceIndicator({ 
  score, 
  level: providedLevel, 
  showLabel = false, 
  size = 'sm',
  className 
}: ConfidenceIndicatorProps) {
  const level = providedLevel || getConfidenceLevel(score);
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';
  
  const colorClass = cn(
    level === 'high' && 'text-comic-green',
    level === 'medium' && 'text-amber-500',
    level === 'low' && 'text-muted-foreground'
  );

  const Icon = level === 'high' ? ShieldCheck : level === 'medium' ? Shield : ShieldAlert;
  
  const indicator = (
    <div className={cn('flex items-center gap-1', colorClass, className)}>
      <Icon className={iconSize} />
      {showLabel && (
        <span className={cn(textSize, 'font-medium')}>
          {level === 'high' ? 'High' : level === 'medium' ? 'Med' : 'Low'}
        </span>
      )}
    </div>
  );
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <div className="text-xs">
            <p className="font-medium">{getConfidenceLabel(level)}</p>
            <p className="text-muted-foreground">{getConfidenceDescription(level)}</p>
            {score !== undefined && (
              <p className="text-muted-foreground mt-1">Score: {score}/100</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
