import { useMemo } from 'react';
import { Comic } from '@/types/comic';
import { Award, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GradingCandidate {
  comic: Comic;
  score: number;
  recommendation: 'strong' | 'consider' | 'skip';
  estimatedGradedValue: number;
  potentialProfit: number;
  reasons: string[];
}

interface GradingOpportunitiesProps {
  comics: Comic[];
}

const GRADING_COST = 75; // Average grading cost

export function GradingOpportunities({ comics }: GradingOpportunitiesProps) {
  const candidates = useMemo(() => {
    // Filter to raw comics only
    const rawComics = comics.filter(c => c.gradeStatus === 'raw');
    
    return rawComics.map(comic => {
      let score = 0;
      const reasons: string[] = [];
      
      // Key issue bonus
      if (comic.isKeyIssue) {
        score += 50;
        reasons.push('Key issue');
      }
      
      // Value-based scoring
      const currentValue = comic.currentValue || 0;
      if (currentValue >= 500) {
        score += 40;
        reasons.push('High value comic');
      } else if (currentValue >= 200) {
        score += 30;
        reasons.push('Moderate value');
      } else if (currentValue >= 100) {
        score += 20;
        reasons.push('Worth protecting');
      } else if (currentValue < 50) {
        score -= 20;
        reasons.push('Low value');
      }
      
      // Age bonus (older comics benefit more from grading)
      if (comic.coverDate) {
        const year = new Date(comic.coverDate).getFullYear();
        const age = new Date().getFullYear() - year;
        if (age >= 30) {
          score += 30;
          reasons.push(`${age}+ year old comic`);
        } else if (age >= 20) {
          score += 20;
          reasons.push('Vintage comic');
        } else if (age >= 10) {
          score += 10;
        }
      }
      
      // Publisher bonus
      if (comic.publisher === 'Marvel Comics' || comic.publisher === 'DC Comics') {
        score += 10;
      }
      
      // First appearance bonus
      if (comic.firstAppearanceOf) {
        score += 40;
        reasons.push(`First appearance of ${comic.firstAppearanceOf}`);
      }
      
      // Estimate graded value (rough estimate: 2-3x for high grades)
      const multiplier = comic.isKeyIssue ? 2.5 : 1.8;
      const estimatedGradedValue = currentValue * multiplier;
      const potentialProfit = estimatedGradedValue - currentValue - GRADING_COST;
      
      // Determine recommendation
      let recommendation: GradingCandidate['recommendation'];
      if (score >= 60 && potentialProfit > 0) {
        recommendation = 'strong';
      } else if (score >= 30 && potentialProfit > -25) {
        recommendation = 'consider';
      } else {
        recommendation = 'skip';
      }
      
      return {
        comic,
        score,
        recommendation,
        estimatedGradedValue,
        potentialProfit,
        reasons,
      };
    })
    .filter(c => c.recommendation !== 'skip')
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  }, [comics]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (candidates.length === 0) {
    return (
      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl">Grading Opportunities</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          No raw comics found that would significantly benefit from grading. 
          Add more comics or check your key issues!
        </p>
      </div>
    );
  }

  return (
    <div className="stat-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-primary" />
        <h3 className="font-display text-xl">Grading Opportunities</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Raw comics that could benefit from professional grading (based on value, age, and key status)
      </p>

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <div 
            key={candidate.comic.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
          >
            {/* Recommendation Icon */}
            <div className={`flex-shrink-0 mt-1 ${
              candidate.recommendation === 'strong' ? 'text-comic-green' : 'text-amber-500'
            }`}>
              {candidate.recommendation === 'strong' ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium truncate">
                  {candidate.comic.title} #{candidate.comic.issueNumber}
                </p>
                <Badge 
                  variant={candidate.recommendation === 'strong' ? 'default' : 'secondary'}
                  className="text-xs flex-shrink-0"
                >
                  {candidate.recommendation === 'strong' ? 'Recommend' : 'Consider'}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2">
                {candidate.reasons.slice(0, 3).map((reason, i) => (
                  <span key={i} className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded">
                    {reason}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Raw: <span className="text-foreground">{formatCurrency(candidate.comic.currentValue || 0)}</span>
                </span>
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Est. 9.8: <span className="gold-text font-semibold">{formatCurrency(candidate.estimatedGradedValue)}</span>
                </span>
              </div>
              
              {candidate.potentialProfit > 0 && (
                <p className="text-xs text-comic-green mt-1">
                  Potential profit: +{formatCurrency(candidate.potentialProfit)} (after ~${GRADING_COST} grading)
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        * Estimates based on market averages. Actual values depend on condition and market demand.
      </p>
    </div>
  );
}
