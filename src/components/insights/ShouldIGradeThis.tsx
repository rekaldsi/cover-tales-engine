import { Comic } from '@/types/comic';
import { Award, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface ShouldIGradeThisProps {
  comic: Comic;
}

const GRADING_COST = 75;

export function ShouldIGradeThis({ comic }: ShouldIGradeThisProps) {
  // Don't show for already graded comics
  if (comic.gradeStatus !== 'raw') {
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
  
  // Estimate graded values
  const multiplier98 = comic.isKeyIssue ? 3 : 2.2;
  const multiplier96 = comic.isKeyIssue ? 2.2 : 1.7;
  const multiplier94 = comic.isKeyIssue ? 1.6 : 1.3;
  
  const est98 = currentValue * multiplier98;
  const est96 = currentValue * multiplier96;
  const est94 = currentValue * multiplier94;
  
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
        *Estimates based on market averages for similar comics
      </p>
    </div>
  );
}
