import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValueHistoryPoint {
  id: string;
  comicId: string;
  value: number;
  source: string;
  recordedAt: string;
}

interface ValueChange {
  change: number;
  percentChange: number;
  periodLabel: string;
}

interface ValueHistoryChartProps {
  history: ValueHistoryPoint[];
  valueChange: ValueChange | null;
  currentValue?: number;
}

export function ValueHistoryChart({ history, valueChange, currentValue }: ValueHistoryChartProps) {
  const chartData = useMemo(() => {
    return history.map(point => ({
      date: new Date(point.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.value,
      source: point.source,
    }));
  }, [history]);

  const TrendIcon = valueChange 
    ? valueChange.percentChange > 0 
      ? TrendingUp 
      : valueChange.percentChange < 0 
        ? TrendingDown 
        : Minus
    : null;

  const trendColor = valueChange
    ? valueChange.percentChange > 0
      ? 'text-green-400'
      : valueChange.percentChange < 0
        ? 'text-red-400'
        : 'text-muted-foreground'
    : 'text-muted-foreground';

  if (history.length < 2) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>Value history will appear after tracking begins</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Trend indicator */}
      {valueChange && TrendIcon && (
        <div className={`flex items-center gap-2 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {valueChange.percentChange > 0 ? '+' : ''}{valueChange.percentChange.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">
            ({valueChange.change > 0 ? '+' : ''}${Math.abs(valueChange.change).toFixed(0)} over {valueChange.periodLabel})
          </span>
        </div>
      )}
      
      {/* Chart */}
      <div className="h-[100px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="comicValueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              interval="preserveStartEnd"
            />
            <YAxis 
              hide 
              domain={['dataMin - 10', 'dataMax + 10']} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontSize: 11 }}
              formatter={(value: number, name: string, props: any) => [
                `$${value.toLocaleString()}`, 
                props.payload.source || 'Value'
              ]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#comicValueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
