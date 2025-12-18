import { ComicEra, ERA_LABELS } from '@/types/comic';

interface EraChartProps {
  data: Record<ComicEra, number>;
}

const ERA_COLORS: Record<ComicEra, string> = {
  golden: 'bg-era-golden',
  silver: 'bg-era-silver',
  bronze: 'bg-era-bronze',
  copper: 'bg-era-copper',
  modern: 'bg-era-modern',
  current: 'bg-era-current',
};

export function EraChart({ data }: EraChartProps) {
  const total = Object.values(data).reduce((sum, count) => sum + count, 0);
  const eras = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]) as [ComicEra, number][];
  
  if (total === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No comics in collection yet
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Bar visualization */}
      <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
        {eras.map(([era, count]) => {
          const percentage = (count / total) * 100;
          return (
            <div
              key={era}
              className={`${ERA_COLORS[era]} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
              title={`${ERA_LABELS[era]}: ${count} comics`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {eras.map(([era, count]) => {
          const percentage = Math.round((count / total) * 100);
          return (
            <div key={era} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${ERA_COLORS[era]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {ERA_LABELS[era]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count} ({percentage}%)
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
