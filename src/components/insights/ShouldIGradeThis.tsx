import { useState, useEffect } from 'react';
import { Comic } from '@/types/comic';
import { Award, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useComicValuation } from '@/hooks/useComicValuation';

interface ShouldIGradeThisProps {
  comic: Comic;
}

const GRADING_COST = 75;

export function ShouldIGradeThis({ comic }: ShouldIGradeThisProps) {
  const { fetchValuation, isLoading } = useComicValuation({ useAggregator: true });
  const [gradedValues, setGradedValues] = useState<{ '9.8'?: number; '9.6'?: number; '9.4'?: number } | null>(null);
  const [dataSource, setDataSource] = useState<'estimate' | 'market'>('estimate');

  const isRaw = comic.gradeStatus === 'raw';

  // Fetch real graded values from market data
  useEffect(() => {
    if (!isRaw) return;
    
    const fetchGradedPrices = async () => {
      if (!comic.title || !comic.issueNumber) return;
      
      try {
        // Try to fetch CGC graded prices
        const result = await fetchValuation(
          comic.title,
          comic.issueNumber,
          comic.publisher,
          9.8,
          undefined,
          'cgc'
        );
        
        if (result.success && result.fmv) {
          setGradedValues({
            '9.8': result.fmv['9.8'],
            '9.6': result.fmv['9.6'],
            '9.4': result.fmv['9.4'],
          });
          setDataSource('market');
        }
      } catch (err) {
        // Silent fail - will use estimates
      }
    };
    
    fetchGradedPrices();
  }, [comic.title, comic.issueNumber, comic.publisher, isRaw, fetchValuation]);

  // Don't show for already graded comics
  if (!isRaw) {
    return null;
  }

  const currentValue = comic.currentValue || 0;
  
  // Calculate score and recommendation
  let score = 0;
  const factors: { label: string; impact: 'positive' | 'negative' | 'neutral' }[] = [];
  
  if (comic.isKeyIssue) {
    score += 50;
    factors.push({ label: 'Key issue status', impact: 'positive' });
  }
  
  if (currentValue >= 200) {
    score += 40;
    factors.push({ label: 'High current value', impact: 'positive' });
  } else if (currentValue >= 100) {
    score += 20;
    factors.push({ label: 'Moderate value', impact: 'neutral' });
  } else if (currentValue < 50) {
    score -= 30;
    factors.push({ label: 'Low value may not justify cost', impact: 'negative' });
  }
  
  if (comic.coverDate) {
    const year = new Date(comic.coverDate).getFullYear();
    const age = new Date().getFullYear() - year;
    if (age >= 25) {
      score += 30;
      factors.push({ label: 'Vintage age adds value', impact: 'positive' });
    }
  }
  
  if (comic.firstAppearanceOf) {
    score += 40;
    factors.push({ label: `First appearance comic`, impact: 'positive' });
  }
  
  // Signature premium for CGC SS books
  const signaturePremium = comic.isSigned ? 
    (comic.signatureType === 'cgc_ss' ? 2.5 : 
     comic.signatureType === 'cbcs_verified' ? 2.0 : 
     comic.signatureType === 'witnessed' ? 1.5 : 1.2) : 1;

  // Add signature factor
  if (comic.isSigned && signaturePremium > 1) {
    score += 30;
    factors.push({ label: `Signature adds ${Math.round((signaturePremium - 1) * 100)}% premium`, impact: 'positive' });
  }

  // Use real market data if available, otherwise use estimates with signature premium
  const baseMultiplier98 = comic.isKeyIssue ? 3 : 2.2;
  const baseMultiplier96 = comic.isKeyIssue ? 2.2 : 1.7;
  const baseMultiplier94 = comic.isKeyIssue ? 1.6 : 1.3;
  
  const multiplier98 = baseMultiplier98 * signaturePremium;
  const multiplier96 = baseMultiplier96 * signaturePremium;
  const multiplier94 = baseMultiplier94 * signaturePremium;
  
  // Prefer real market data over estimates
  const est98 = gradedValues?.['9.8'] || (currentValue * multiplier98);
  const est96 = gradedValues?.['9.6'] || (currentValue * multiplier96);
  const est94 = gradedValues?.['9.4'] || (currentValue * multiplier94);
  
  const profit98 = est98 - currentValue - GRADING_COST;
  
  // Determine recommendation
  let recommendation: 'grade' | 'consider' | 'skip';
  let color: string;
  let Icon: typeof CheckCircle2;
  
  if (score >= 60 && profit98 > 50) {
    recommendation = 'grade';
    color = 'text-comic-green';
    Icon = CheckCircle2;
  } else if (score >= 30 && profit98 > -25) {
    recommendation = 'consider';
    color = 'text-amber-500';
    Icon = AlertTriangle;
  } else {
    recommendation = 'skip';
    color = 'text-muted-foreground';
    Icon = XCircle;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="p-4 rounded-lg bg-secondary/50 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">Should I Grade This?</h4>
      </div>
      
      {/* Recommendation */}
      <div className={`flex items-center gap-2 mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
        <span className="font-semibold">
          {recommendation === 'grade' && 'Recommend Grading'}
          {recommendation === 'consider' && 'Consider Grading'}
          {recommendation === 'skip' && 'Not Recommended'}
        </span>
      </div>
      
      {/* Factors */}
      <div className="space-y-1 mb-4">
        {factors.map((factor, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${
              factor.impact === 'positive' ? 'bg-comic-green' :
              factor.impact === 'negative' ? 'bg-destructive' :
              'bg-muted-foreground'
            }`} />
            <span className="text-muted-foreground">{factor.label}</span>
          </div>
        ))}
      </div>
      
      {/* Value Estimates */}
      {currentValue > 0 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Estimated Graded Values</p>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">9.8</p>
              <p className="font-semibold gold-text">{formatCurrency(est98)}</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">9.6</p>
              <p className="font-semibold">{formatCurrency(est96)}</p>
            </div>
            <div className="p-2 rounded bg-background/50">
              <p className="text-xs text-muted-foreground">9.4</p>
              <p className="font-semibold">{formatCurrency(est94)}</p>
            </div>
          </div>
          
          {profit98 > 0 && (
            <p className="text-xs text-comic-green flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" />
              At 9.8: +{formatCurrency(profit98)} profit after ~${GRADING_COST} grading
            </p>
          )}
        </div>
      )}
      
      <p className="text-[10px] text-muted-foreground mt-3">
        {isLoading ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Fetching market prices...
          </span>
        ) : dataSource === 'market' ? (
          '*Based on recent eBay/GoCollect sales data'
        ) : (
          '*Estimates based on market averages for similar comics'
        )}
      </p>
    </div>
  );
}
