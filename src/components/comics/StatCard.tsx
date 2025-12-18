import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: 'primary' | 'gold' | 'blue' | 'green';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, accentColor = 'primary' }: StatCardProps) {
  const accentClasses = {
    primary: 'from-primary/20 to-transparent text-primary',
    gold: 'from-accent/20 to-transparent text-accent',
    blue: 'from-comic-blue/20 to-transparent text-comic-blue',
    green: 'from-comic-green/20 to-transparent text-comic-green',
  };
  
  return (
    <div className="stat-card group hover:border-primary/30 transition-colors">
      {/* Gradient accent based on color */}
      <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b ${accentClasses[accentColor]} opacity-50`} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${accentClasses[accentColor]}`}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              trend.isPositive 
                ? 'bg-comic-green/10 text-comic-green' 
                : 'bg-destructive/10 text-destructive'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
        
        <div>
          <p className="text-3xl font-display tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-sm font-medium text-foreground mt-1">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
