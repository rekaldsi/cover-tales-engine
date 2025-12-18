import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FMVData {
  raw?: number;
  '9.8'?: number;
  '9.6'?: number;
  '9.4'?: number;
  '9.2'?: number;
  '9.0'?: number;
  '8.0'?: number;
  current?: number;
}

interface ValuationResult {
  success: boolean;
  source: 'gocollect' | 'manual' | 'unavailable';
  fmv: FMVData | null;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage?: number;
  } | null;
  recentSales?: Array<{
    price: number;
    grade: string;
    date: string;
  }>;
  error?: string;
}

interface UseComicValuationOptions {
  autoRetry?: boolean;
  cacheResults?: boolean;
}

// Simple in-memory cache for valuation results
const valuationCache = new Map<string, { data: ValuationResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

function getCacheKey(title: string, issueNumber: string, publisher?: string): string {
  return `${title}:${issueNumber}:${publisher || ''}`.toLowerCase();
}

export function useComicValuation(options: UseComicValuationOptions = {}) {
  const { autoRetry = true, cacheResults = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ValuationResult | null>(null);
  const { toast } = useToast();

  const fetchValuation = useCallback(async (
    title: string,
    issueNumber: string,
    publisher?: string,
    grade?: number,
    certNumber?: string
  ): Promise<ValuationResult> => {
    const cacheKey = getCacheKey(title, issueNumber, publisher);
    
    // Check cache first
    if (cacheResults) {
      const cached = valuationCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setLastResult(cached.data);
        return cached.data;
      }
    }

    setIsLoading(true);

    try {
      // Try GoCollect first
      const { data, error } = await supabase.functions.invoke('fetch-gocollect-value', {
        body: { title, issue_number: issueNumber, publisher, grade, cert_number: certNumber }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch valuation');
      }

      if (data?.success) {
        const result: ValuationResult = {
          success: true,
          source: 'gocollect',
          fmv: data.fmv,
          trend: data.trend,
          recentSales: data.recent_sales,
        };

        if (cacheResults) {
          valuationCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        setLastResult(result);
        return result;
      }

      // GoCollect returned an error response
      const result: ValuationResult = {
        success: false,
        source: 'unavailable',
        fmv: null,
        error: data?.error || 'Comic not found in valuation database',
      };

      setLastResult(result);
      return result;

    } catch (err) {
      console.error('Valuation fetch error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch valuation';
      
      // Don't show toast for expected "not found" errors
      if (!errorMessage.includes('not found')) {
        toast({
          title: 'Valuation Unavailable',
          description: errorMessage,
          variant: 'destructive',
        });
      }

      const result: ValuationResult = {
        success: false,
        source: 'unavailable',
        fmv: null,
        error: errorMessage,
      };

      setLastResult(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, [cacheResults, toast]);

  // Clear cache for a specific comic or all
  const clearCache = useCallback((title?: string, issueNumber?: string, publisher?: string) => {
    if (title && issueNumber) {
      valuationCache.delete(getCacheKey(title, issueNumber, publisher));
    } else {
      valuationCache.clear();
    }
  }, []);

  // Format currency for display
  const formatValue = useCallback((value?: number): string => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Get grade-specific value from FMV data
  const getValueAtGrade = useCallback((fmv: FMVData | null, grade: string): number | undefined => {
    if (!fmv) return undefined;
    
    if (grade === 'raw') return fmv.raw;
    return fmv[grade as keyof FMVData] as number | undefined;
  }, []);

  return {
    isLoading,
    lastResult,
    fetchValuation,
    clearCache,
    formatValue,
    getValueAtGrade,
  };
}
