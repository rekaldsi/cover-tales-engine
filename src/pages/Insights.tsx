import { useComicCollection } from '@/hooks/useComicCollection';
import { StatCard } from '@/components/comics/StatCard';
import { TrendingUp, TrendingDown, Star, Zap, Target, DollarSign } from 'lucide-react';

export default function Insights() {
  const { comics, getStats } = useComicCollection();
  const stats = getStats();
  
  // Calculate insights
  const keyIssues = comics.filter(c => c.isKeyIssue);
  const totalInvested = comics.reduce((sum, c) => sum + (c.purchasePrice || 0), 0);
  const totalValue = stats.totalValue;
  const totalProfit = totalValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : '0';
  
  const mostValuableComics = [...comics]
    .filter(c => c.currentValue)
    .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
    .slice(0, 5);
    
  const bestInvestments = [...comics]
    .filter(c => c.purchasePrice && c.currentValue)
    .map(c => ({
      ...c,
      profit: (c.currentValue || 0) - (c.purchasePrice || 0),
      profitPercent: (((c.currentValue || 0) - (c.purchasePrice || 0)) / (c.purchasePrice || 1)) * 100
    }))
    .sort((a, b) => b.profitPercent - a.profitPercent)
    .slice(0, 5);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight">Insights</h1>
        <p className="text-muted-foreground">
          Collection analytics and market intelligence
        </p>
      </div>
      
      {/* Investment Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invested"
          value={formatCurrency(totalInvested)}
          subtitle="purchase cost"
          icon={Target}
          accentColor="blue"
        />
        <StatCard
          title="Current Value"
          value={formatCurrency(totalValue)}
          subtitle="estimated FMV"
          icon={DollarSign}
          accentColor="gold"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(totalProfit)}
          subtitle={`${profitPercentage}% return`}
          icon={totalProfit >= 0 ? TrendingUp : TrendingDown}
          accentColor={totalProfit >= 0 ? 'green' : 'primary'}
          trend={{ value: parseFloat(profitPercentage), isPositive: totalProfit >= 0 }}
        />
        <StatCard
          title="Key Issues"
          value={keyIssues.length}
          subtitle="valuable keys"
          icon={Star}
          accentColor="gold"
        />
      </section>
      
      {/* Most Valuable */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="stat-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-accent" />
            <h3 className="font-display text-xl">Most Valuable</h3>
          </div>
          
          {mostValuableComics.length === 0 ? (
            <p className="text-muted-foreground text-sm">No valued comics yet</p>
          ) : (
            <div className="space-y-3">
              {mostValuableComics.map((comic, index) => (
                <div key={comic.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{comic.title} #{comic.issueNumber}</p>
                    <p className="text-xs text-muted-foreground">{comic.publisher}</p>
                  </div>
                  <span className="font-semibold gold-text">
                    {formatCurrency(comic.currentValue || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="stat-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-comic-green" />
            <h3 className="font-display text-xl">Best Investments</h3>
          </div>
          
          {bestInvestments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Add purchase prices to track ROI</p>
          ) : (
            <div className="space-y-3">
              {bestInvestments.map((comic, index) => (
                <div key={comic.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-comic-green/10 text-comic-green text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{comic.title} #{comic.issueNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(comic.purchasePrice || 0)} → {formatCurrency(comic.currentValue || 0)}
                    </p>
                  </div>
                  <span className="font-semibold text-comic-green">
                    +{comic.profitPercent.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      
      {/* Key Issues List */}
      <section className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-accent" />
          <h3 className="font-display text-xl">Key Issues in Collection</h3>
        </div>
        
        {keyIssues.length === 0 ? (
          <p className="text-muted-foreground text-sm">No key issues marked yet</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {keyIssues.map(comic => (
              <div 
                key={comic.id}
                className="p-4 rounded-lg bg-secondary/50 border border-border hover:border-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold">{comic.title}</h4>
                    <p className="text-sm text-muted-foreground">#{comic.issueNumber}</p>
                  </div>
                  {comic.currentValue && (
                    <span className="text-sm font-semibold gold-text">
                      {formatCurrency(comic.currentValue)}
                    </span>
                  )}
                </div>
                {comic.keyIssueReason && (
                  <p className="text-xs text-accent">{comic.keyIssueReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Coming Soon */}
      <section className="text-center py-12 border border-dashed border-border rounded-xl">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">More Insights Coming Soon</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Market trend analysis, price alerts, and AI-powered recommendations are on the way.
        </p>
      </section>
    </div>
  );
}
