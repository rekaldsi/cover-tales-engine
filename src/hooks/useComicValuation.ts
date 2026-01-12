import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ValueSource, DataDiscrepancy } from '@/types/comic';

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
  source: 'gocollect' | 'ebay_estimate' | 'aggregated' | 'manual' | 'unavailable';
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
  // eBay-specific data
  ebayData?: {
    averageAskingPrice?: number;
    estimatedSoldPrice?: number;
    lowestPrice?: number;
    highestPrice?: number;
    listingCount: number;
    listings?: Array<{
      title: string;
      price: number;
      condition: string;
      imageUrl?: string;
      itemUrl: string;
    }>;
  };
  // Multi-source aggregated data
  aggregatedData?: {
    recommendedValue: number;
    valueRange: { low: number; high: number };
    confidence: 'high' | 'medium' | 'low';
    sources: ValueSource[];
    fmvByGrade: Record<string, {
      recommended: number;
      range: { low: number; high: number };
      sources: { source: string; value: number }[];
    }>;
    discrepancies?: DataDiscrepancy[];
    verifiedAt: string;
  };
  error?: string;
}

interface UseComicValuationOptions {
  autoRetry?: boolean;
  cacheResults?: boolean;
  useAggregator?: boolean;
}

// Simple in-memory cache for valuation results
const valuationCache = new Map<string, { data: ValuationResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

function getCacheKey(title: string, issueNumber: string, publisher?: string, aggregated?: boolean): string {
  return `${title}:${issueNumber}:${publisher || ''}:${aggregated ? 'agg' : 'simple'}`.toLowerCase();
}

export function useComicValuation(options: UseComicValuationOptions = {}) {
  const { cacheResults = true, useAggregator = false } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ValuationResult | null>(null);
  const { toast } = useToast();

  const fetchValuation = useCallback(async (
    title: string,
    issueNumber: string,
    publisher?: string,
    grade?: number,
    certNumber?: string,
    gradeStatus?: string
  ): Promise<ValuationResult> => {
    const cacheKey = getCacheKey(title, issueNumber, publisher, useAggregator);
    
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
      // If using aggregator, fetch from all sources
      if (useAggregator) {
        logger.log('Using multi-source aggregator...');
        const { data: aggData, error: aggError } = await supabase.functions.invoke('aggregate-comic-data', {
          body: { 
            title, 
            issue_number: issueNumber, 
            publisher, 
            grade, 
            cert_number: certNumber,
            grade_status: gradeStatus,
          }
        });

        if (!aggError && aggData?.success) {
          const result: ValuationResult = {
            success: true,
            source: 'aggregated',
            fmv: { current: aggData.recommendedValue },
            aggregatedData: {
              recommendedValue: aggData.recommendedValue,
              valueRange: aggData.valueRange,
              confidence: aggData.confidence,
              sources: aggData.sources,
              fmvByGrade: aggData.fmvByGrade,
              discrepancies: aggData.discrepancies,
              verifiedAt: aggData.verifiedAt,
            },
          };

          if (cacheResults) {
            valuationCache.set(cacheKey, { data: result, timestamp: Date.now() });
          }
          setLastResult(result);
          return result;
        }
      }

      // Tier 1: Try GoCollect first
      logger.log('Tier 1: Trying GoCollect...');
      const { data: goCollectData, error: goCollectError } = await supabase.functions.invoke('fetch-gocollect-value', {
        body: { title, issue_number: issueNumber, publisher, grade, cert_number: certNumber }
      });

      if (!goCollectError && goCollectData?.success) {
        const result: ValuationResult = {
          success: true,
          source: 'gocollect',
          fmv: goCollectData.fmv,
          trend: goCollectData.trend,
          recentSales: goCollectData.recent_sales,
        };

        if (cacheResults) {
          valuationCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        setLastResult(result);
        return result;
      }

      // Tier 2: Try eBay estimation
      logger.log('Tier 2: Trying eBay estimate...');
      const { data: ebayData, error: ebayError } = await supabase.functions.invoke('fetch-ebay-prices', {
        body: { title, issueNumber, publisher, grade, gradeStatus }
      });

      if (!ebayError && ebayData?.success && ebayData?.listingCount > 0) {
        // Convert eBay data to FMV format
        const estimatedValue = ebayData.estimatedSoldPrice || ebayData.averageAskingPrice;
        const result: ValuationResult = {
          success: true,
          source: 'ebay_estimate',
          fmv: {
            current: estimatedValue,
            raw: gradeStatus === 'raw' ? estimatedValue : undefined,
          },
          ebayData: {
            averageAskingPrice: ebayData.averageAskingPrice,
            estimatedSoldPrice: ebayData.estimatedSoldPrice,
            lowestPrice: ebayData.lowestPrice,
            highestPrice: ebayData.highestPrice,
            listingCount: ebayData.listingCount,
            listings: ebayData.listings,
          },
        };

        if (cacheResults) {
          valuationCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        setLastResult(result);
        return result;
      }

      // Tier 3: No automated valuation available
      logger.log('Tier 3: No automated valuation available');
      const result: ValuationResult = {
        success: false,
        source: 'unavailable',
        fmv: null,
        error: 'No valuation data available. You can enter a manual value.',
      };

      setLastResult(result);
      return result;

    } catch (err) {
      logger.error('Valuation fetch error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch valuation';
      
      // Don't show toast for expected "not found" errors
      if (!errorMessage.includes('not found')) {
        toast({
          title: 'Valuation Unavailable',
          description: 'Could not fetch pricing data. You can enter a manual value.',
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

  // Get source display label
  const getSourceLabel = useCallback((source: ValuationResult['source']): string => {
    switch (source) {
      case 'gocollect':
        return 'GoCollect FMV';
      case 'ebay_estimate':
        return 'eBay Estimate';
      case 'aggregated':
        return 'Multi-Source Verified';
      case 'manual':
        return 'Manual Entry';
      default:
        return 'Unknown';
    }
  }, []);

  return {
    isLoading,
    lastResult,
    fetchValuation,
    clearCache,
    formatValue,
    getValueAtGrade,
    getSourceLabel,
  };
}
