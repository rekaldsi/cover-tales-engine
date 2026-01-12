import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPullDistance?: number;
  refreshingText?: string;
  pullText?: string;
  enabled?: boolean;
}

/**
 * Pull-to-refresh hook for mobile devices
 * Adds native-like pull-to-refresh functionality
 *
 * @param onRefresh - Async function to call when refresh is triggered
 * @param threshold - Distance in pixels to trigger refresh (default: 80)
 * @param maxPullDistance - Maximum pull distance (default: 120)
 * @param enabled - Whether pull-to-refresh is enabled (default: true on mobile)
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTriggered, setIsTriggered] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Only enable on touch devices
    const isTouchDevice = 'ontouchstart' in window;
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (window.scrollY === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      // Only pull down
      if (distance > 0) {
        // Prevent default scroll behavior while pulling
        e.preventDefault();

        // Apply resistance curve (gets harder to pull further down)
        const resistance = 0.5;
        const adjustedDistance = Math.min(
          distance * resistance,
          maxPullDistance
        );

        setPullDistance(adjustedDistance);
        setIsTriggered(adjustedDistance >= threshold);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;

      isPulling.current = false;

      if (pullDistance >= threshold) {
        // Trigger refresh
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Pull-to-refresh error:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsTriggered(false);
        }
      } else {
        // Reset without refreshing
        setPullDistance(0);
        setIsTriggered(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onRefresh, threshold, maxPullDistance, pullDistance, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    isTriggered,
    // Helper for visual feedback
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}
