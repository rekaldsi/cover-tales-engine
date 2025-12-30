import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface IntegrationRun {
  id: string;
  created_at: string;
  function: string;
  provider: string;
  status: 'ok' | 'error' | 'partial';
  latency_ms: number | null;
  http_status: number | null;
  error_code: string | null;
  error_message: string | null;
  summary: Record<string, any> | null;
}

interface ProviderStats {
  provider: string;
  total: number;
  ok: number;
  error: number;
  avgLatency: number;
  errorRate: number;
}

export default function DebugHealth() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<IntegrationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [functionFilter, setFunctionFilter] = useState<string>('all');
  const [stats, setStats] = useState<ProviderStats[]>([]);

  // Check if debug mode is enabled
  const debugEnabled = import.meta.env.VITE_DEBUG_MODE === 'true';

  const fetchRuns = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('integration_runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (providerFilter !== 'all') {
        query = query.eq('provider', providerFilter);
      }
      if (functionFilter !== 'all') {
        query = query.eq('function', functionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRuns((data as IntegrationRun[]) || []);

      // Calculate stats
      if (data) {
        const providerMap = new Map<string, { total: number; ok: number; error: number; totalLatency: number }>();
        
        for (const run of data as IntegrationRun[]) {
          const existing = providerMap.get(run.provider) || { total: 0, ok: 0, error: 0, totalLatency: 0 };
          existing.total++;
          if (run.status === 'ok') existing.ok++;
          if (run.status === 'error') existing.error++;
          existing.totalLatency += run.latency_ms || 0;
          providerMap.set(run.provider, existing);
        }

        const statsArray: ProviderStats[] = [];
        for (const [provider, values] of providerMap) {
          statsArray.push({
            provider,
            total: values.total,
            ok: values.ok,
            error: values.error,
            avgLatency: Math.round(values.totalLatency / values.total),
            errorRate: Math.round((values.error / values.total) * 100),
          });
        }
        setStats(statsArray.sort((a, b) => b.total - a.total));
      }
    } catch (error) {
      console.error('Failed to fetch integration runs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [user, providerFilter, functionFilter]);

  // If debug mode is not enabled, redirect to home
  if (!debugEnabled) {
    return <Navigate to="/" replace />;
  }

  const uniqueProviders = [...new Set(runs.map(r => r.provider))];
  const uniqueFunctions = [...new Set(runs.map(r => r.function))];

  const statusIcon = (status: string) => {
    if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  const statusBadge = (status: string) => {
    if (status === 'ok') return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">OK</Badge>;
    if (status === 'error') return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">ERROR</Badge>;
    return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">PARTIAL</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Data Health Panel</h1>
              <p className="text-sm text-muted-foreground">Integration run monitoring & debugging</p>
            </div>
          </div>
          <Button onClick={fetchRuns} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Provider Stats */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stats.map((stat) => (
              <Card key={stat.provider} className="glass-panel">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {stat.provider}
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.total}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-green-500">{stat.ok} ok</span>
                    <span className="text-red-500">{stat.error} err</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {stat.avgLatency}ms • {stat.errorRate}% fail
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="glass-panel">
          <CardContent className="p-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Provider:</span>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {uniqueProviders.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Function:</span>
              <Select value={functionFilter} onValueChange={setFunctionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Functions</SelectItem>
                  {uniqueFunctions.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Runs List */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-lg">Recent Integration Runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No integration runs found. Try scanning a comic or refreshing values.
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className="mt-1">{statusIcon(run.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm text-foreground">{run.function}</span>
                        <Badge variant="secondary" className="text-xs">{run.provider}</Badge>
                        {statusBadge(run.status)}
                        {run.latency_ms && (
                          <span className="text-xs text-muted-foreground">{run.latency_ms}ms</span>
                        )}
                        {run.http_status && (
                          <span className="text-xs text-muted-foreground">HTTP {run.http_status}</span>
                        )}
                      </div>
                      {run.error_message && (
                        <div className="text-xs text-red-400 mt-1 font-mono truncate">
                          {run.error_code && `[${run.error_code}] `}{run.error_message}
                        </div>
                      )}
                      {run.summary && (
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {JSON.stringify(run.summary).substring(0, 100)}...
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(run.created_at), 'MMM d, HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
