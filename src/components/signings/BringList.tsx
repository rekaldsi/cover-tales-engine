import { SigningRecommendation } from '@/hooks/useSigningRecommendations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Star, TrendingUp, Check, X, DollarSign } from 'lucide-react';

interface BringListProps {
  recommendations: SigningRecommendation[];
  onUpdateStatus: (recId: string, status: string) => void;
}

export function BringList({ recommendations, onUpdateStatus }: BringListProps) {
  const formatCurrency = (value: number | null) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'bringing':
        return <Badge className="bg-comic-green">Bringing</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'signed':
        return <Badge className="bg-primary">Signed!</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const totalValue = recommendations.reduce((sum, r) => sum + (r.currentValue || 0), 0);
  const estimatedUplift = recommendations.reduce((sum, r) => {
    const current = r.currentValue || 0;
    const signed = r.estimatedSignedValue || current;
    return sum + (signed - current);
  }, 0);

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No recommendations yet</p>
        <p className="text-sm mt-1">Add guests to see matching comics from your collection</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
        <div className="text-center">
          <p className="text-2xl font-display text-primary">{recommendations.length}</p>
          <p className="text-xs text-muted-foreground">Comics to Bring</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display gold-text">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground">Current Value</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-display text-comic-green">+{formatCurrency(estimatedUplift)}</p>
          <p className="text-xs text-muted-foreground">Est. Uplift</p>
        </div>
      </div>

      {/* Recommendations List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              {/* Cover */}
              {rec.comic?.coverImageUrl ? (
                <img 
                  src={rec.comic.coverImageUrl} 
                  alt={rec.comic.title}
                  className="w-12 h-16 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
                  No Cover
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {rec.comic?.title} #{rec.comic?.issueNumber}
                  </p>
                  {rec.comic?.isKeyIssue && (
                    <Star className="h-4 w-4 text-accent fill-accent flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {rec.matchReason}
                </p>
                {rec.guest && (
                  <p className="text-xs text-primary truncate">
                    Sign by: {rec.guest.guestName}
                  </p>
                )}
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0 space-y-1">
                <p className="font-semibold gold-text">{formatCurrency(rec.currentValue)}</p>
                {rec.valueUpliftPercent && rec.valueUpliftPercent > 0 && (
                  <div className="flex items-center gap-1 text-comic-green text-xs justify-end">
                    <TrendingUp className="h-3 w-3" />
                    +{rec.valueUpliftPercent.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {getStatusBadge(rec.status)}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-comic-green hover:bg-comic-green/10"
                    onClick={() => onUpdateStatus(rec.id, 'bringing')}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:bg-muted"
                    onClick={() => onUpdateStatus(rec.id, 'skipped')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
