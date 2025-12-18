import { useState, useRef, useCallback, useEffect } from 'react';

interface ScanHistoryItem {
  hash: string;
  timestamp: number;
}

interface UseContinuousScanOptions {
  stabilizationMs?: number;
  changeThreshold?: number;
  hashMemoryMs?: number;
}

export function useContinuousScan({
  stabilizationMs = 1000,
  changeThreshold = 0.15,
  hashMemoryMs = 30000,
}: UseContinuousScanOptions = {}) {
  const [isStable, setIsStable] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const previousFrameRef = useRef<ImageData | null>(null);
  const stableStartRef = useRef<number | null>(null);
  const scanHistoryRef = useRef<ScanHistoryItem[]>([]);
  const lastFrameHashRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Generate a simple hash from image data for duplicate detection
  const generateFrameHash = useCallback((imageData: ImageData): string => {
    const data = imageData.data;
    let hash = 0;
    const step = Math.floor(data.length / 100); // Sample ~100 pixels
    
    for (let i = 0; i < data.length; i += step) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(16);
  }, []);

  // Compare two frames and return similarity percentage (0-1)
  const compareFrames = useCallback((current: ImageData, previous: ImageData): number => {
    if (current.width !== previous.width || current.height !== previous.height) {
      return 0;
    }
    
    const currentData = current.data;
    const previousData = previous.data;
    let diffCount = 0;
    const sampleStep = 16; // Sample every 16th pixel for performance
    const threshold = 30; // RGB difference threshold
    
    for (let i = 0; i < currentData.length; i += 4 * sampleStep) {
      const rDiff = Math.abs(currentData[i] - previousData[i]);
      const gDiff = Math.abs(currentData[i + 1] - previousData[i + 1]);
      const bDiff = Math.abs(currentData[i + 2] - previousData[i + 2]);
      
      if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
        diffCount++;
      }
    }
    
    const totalSamples = Math.floor(currentData.length / (4 * sampleStep));
    return diffCount / totalSamples;
  }, []);

  // Check if this frame was recently scanned
  const wasRecentlyScanned = useCallback((hash: string): boolean => {
    const now = Date.now();
    // Clean old entries
    scanHistoryRef.current = scanHistoryRef.current.filter(
      item => now - item.timestamp < hashMemoryMs
    );
    
    return scanHistoryRef.current.some(item => item.hash === hash);
  }, [hashMemoryMs]);

  // Mark a frame as scanned
  const markAsScanned = useCallback((hash: string) => {
    scanHistoryRef.current.push({
      hash,
      timestamp: Date.now(),
    });
  }, []);

  // Process a frame and determine if it's stable enough to scan
  const processFrame = useCallback((
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    onStableFrame: (imageData: ImageData, hash: string) => void
  ) => {
    if (isProcessing) return;
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const currentHash = generateFrameHash(imageData);
      
      // Skip if same as last frame (no change at all)
      if (currentHash === lastFrameHashRef.current) {
        return;
      }
      lastFrameHashRef.current = currentHash;
      
      // Compare with previous frame
      if (previousFrameRef.current) {
        const changeAmount = compareFrames(imageData, previousFrameRef.current);
        
        if (changeAmount < changeThreshold) {
          // Frame is stable (not much change)
          if (!stableStartRef.current) {
            stableStartRef.current = Date.now();
          }
          
          const stableTime = Date.now() - stableStartRef.current;
          const progress = Math.min(stableTime / stabilizationMs, 1);
          setStabilityProgress(progress);
          
          if (stableTime >= stabilizationMs && !wasRecentlyScanned(currentHash)) {
            setIsStable(true);
            markAsScanned(currentHash);
            onStableFrame(imageData, currentHash);
          }
        } else {
          // Significant change - reset stability
          stableStartRef.current = null;
          setStabilityProgress(0);
          setIsStable(false);
        }
      }
      
      previousFrameRef.current = imageData;
    } catch (err) {
      console.error('Frame processing error:', err);
    }
  }, [isProcessing, generateFrameHash, compareFrames, changeThreshold, stabilizationMs, wasRecentlyScanned, markAsScanned]);

  // Reset for next scan
  const resetStability = useCallback(() => {
    stableStartRef.current = null;
    setStabilityProgress(0);
    setIsStable(false);
  }, []);

  // Set processing state (prevents new scans while processing)
  const setProcessing = useCallback((processing: boolean) => {
    setIsProcessing(processing);
    if (!processing) {
      resetStability();
    }
  }, [resetStability]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isStable,
    stabilityProgress,
    isProcessing,
    processFrame,
    resetStability,
    setProcessing,
    scanHistory: scanHistoryRef.current,
  };
}
