import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PortfolioSnapshot {
  id: string;
  totalValue: number;
  comicCount: number;
  snapshotDate: string;
}

interface PortfolioTrend {
  percentChange: number;
  valueChange: number;
  periodLabel: string;
}

interface PortfolioChartProps {
  snapshots: PortfolioSnapshot[];
  trend: PortfolioTrend | null;
  currentValue: number;
}

export function PortfolioChart({ snapshots, trend, currentValue }: PortfolioChartProps) {
  const chartData = useMemo(() => {
    // Reverse to show oldest first for chart
    return [...snapshots].reverse().map(s => ({
      date: new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: s.totalValue,
    }));
  }, [snapshots]);

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const TrendIcon = trend 
    ? trend.percentChange > 0 
      ? TrendingUp 
      : trend.percentChange < 0 
        ? TrendingDown 
        : Minus
    : Minus;

  const trendColor = trend
    ? trend.percentChange > 0
      ? 'text-green-400'
      : trend.percentChange < 0
        ? 'text-red-400'
        : 'text-muted-foreground'
    : 'text-muted-foreground';

  if (snapshots.length < 2) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-3xl font-bold text-foreground mb-2">
              ${currentValue.toLocaleString()}
            </p>
            <p className="text-sm">
              Value history will appear after a few days of tracking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Portfolio Value</CardTitle>
          {trend && (
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({trend.periodLabel})
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-3xl font-bold">${currentValue.toLocaleString()}</p>
          {trend && (
            <p className={`text-sm ${trendColor}`}>
              {trend.valueChange > 0 ? '+' : ''}${trend.valueChange.toLocaleString()} from {trend.periodLabel} ago
            </p>
          )}
        </div>
        
        <div className="h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                hide 
                domain={['dataMin - 100', 'dataMax + 100']} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  padding: '8px 12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#valueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}