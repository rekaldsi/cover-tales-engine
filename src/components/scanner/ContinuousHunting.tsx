import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Camera, XCircle, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { VerdictPill } from './VerdictPill';
import { ScanProgressStepper, type ScanStage } from './ScanProgressStepper';
import { ScanErrorDisplay, categorizeError, type ScanError } from './ScanErrorDisplay';
import { useContinuousScan } from '@/hooks/useContinuousScan';
import { useHuntingFeedback } from '@/hooks/useHuntingFeedback';
import { useScanResultCache } from '@/hooks/useScanResultCache';
import { getIssueKey } from '@/hooks/useGroupedComics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Comic } from '@/types/comic';

type Verdict = 'get' | 'consider' | 'pass' | null;

interface HuntingResult {
  title: string;
  issueNumber: string;
  publisher: string;
  variant?: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  // Enhanced value data
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  valueConfidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  verdict: Verdict;
  // Enhanced ownership data
  isMissing: boolean;
  ownedCopyCount?: number;
}

interface ContinuousHuntingProps {
  ownedComics: Comic[];
  onExit: () => void;
}

function getVerdict(rawValue?: number, isKeyIssue?: boolean, issueNumber?: string): Verdict {
  const value = rawValue || 0;
  
  if (value >= 50 || isKeyIssue) {
    return 'get';
  } else if (value >= 15 || issueNumber === '1') {
    return 'consider';
  }
  return 'pass';
}

export function ContinuousHunting({ ownedComics, onExit }: ContinuousHuntingProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<HuntingResult | null>(null);
  const [scanCount, setTotalScans] = useState(0);
  const [recentScans, setRecentScans] = useState<HuntingResult[]>([]);
  const [scanStage, setScanStage] = useState<ScanStage | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  
  const { toast } = useToast();
  const { triggerFeedback, playChaChing, vibrate } = useHuntingFeedback();
  const { get: getCachedResult, set: setCachedResult } = useScanResultCache<HuntingResult>();
  const {
    stabilityProgress,
    isProcessing,
    processFrame,
    setProcessing,
    resetStability,
  } = useContinuousScan({
    stabilizationMs: 500,
    changeThreshold: 0.25,
  });

  // Check if comic is in collection (variant-aware)
  const checkIfOwned = useCallback((title: string, issueNumber: string, publisher: string, variant?: string) => {
    const tempComic: Partial<Comic> = {
      title,
      issueNumber,
      publisher: publisher || '',
      variant: variant || '',
    };
    const issueKey = getIssueKey(tempComic as Comic);
    const matchingComics = ownedComics.filter(c => getIssueKey(c) === issueKey);

    return {
      isMissing: matchingComics.length === 0,
      copyCount: matchingComics.length,
    };
  }, [ownedComics]);

  // Recognize and lookup comic
  const recognizeComic = useCallback(async (imageData: ImageData) => {
    setProcessing(true);
    setScanStage('detecting');
    setScanError(null);
    
    try {
      // Convert ImageData to base64
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context failed');
      
      ctx.putImageData(imageData, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8);
      
      // Detection beep
      vibrate(50);
      
      setScanStage('identifying');
      
      // Call AI recognition
      const { data: recognizeData, error: recognizeError } = await supabase.functions.invoke('recognize-comic', {
        body: { image: base64Image }
      });
      
      if (recognizeError) throw recognizeError;
      
      if (!recognizeData?.title) {
        // Could not recognize - short feedback and continue
        vibrate([30, 30, 30]);
        setScanStage(null);
        setProcessing(false);
        return;
      }
      
      // Check cache first
      const tempComic: Partial<Comic> = {
        title: recognizeData.title,
        issueNumber: recognizeData.issueNumber,
        publisher: recognizeData.publisher || '',
        variant: recognizeData.variant || '',
      };
      const issueKey = getIssueKey(tempComic as Comic);
      const cachedResult = getCachedResult(issueKey);

      if (cachedResult) {
        // Use cached result
        setScanStage('complete');
        setCurrentResult(cachedResult);
        setTotalScans(prev => prev + 1);
        setRecentScans(prev => [cachedResult, ...prev].slice(0, 5));
        triggerFeedback(cachedResult.verdict, cachedResult.isKeyIssue);
        return;
      }

      setScanStage('valuing');

      // Fetch value data (multi-source aggregation)
      let rawValue: number | undefined;
      let gradedValue98: number | undefined;
      let valueRange: { low: number; high: number } | undefined;
      let valueConfidence: 'high' | 'medium' | 'low' | undefined;
      let confidenceScore: number | undefined;

      try {
        const { data: valueData } = await supabase.functions.invoke('aggregate-comic-data', {
          body: {
            title: recognizeData.title,
            issue_number: recognizeData.issueNumber,
            publisher: recognizeData.publisher,
            grade_status: 'raw',
            include_sources: ['gocollect', 'ebay'], // Fast sources only
          }
        });

        if (valueData) {
          rawValue = valueData.recommendedValue;
          gradedValue98 = valueData.fmvByGrade?.['9.8']?.recommended;
          valueRange = valueData.valueRange;
          valueConfidence = valueData.confidence;
          confidenceScore = valueData.confidenceScore;
        }
      } catch {
        console.log('Value lookup failed, continuing without value');
      }

      const ownershipInfo = checkIfOwned(
        recognizeData.title,
        recognizeData.issueNumber,
        recognizeData.publisher,
        recognizeData.variant
      );
      const verdict = getVerdict(rawValue, recognizeData.isKeyIssue, recognizeData.issueNumber);

      const result: HuntingResult = {
        title: recognizeData.title,
        issueNumber: recognizeData.issueNumber,
        publisher: recognizeData.publisher || 'Unknown',
        variant: recognizeData.variant,
        coverImageUrl: recognizeData.coverImageUrl,
        isKeyIssue: recognizeData.isKeyIssue || false,
        keyIssueReason: recognizeData.keyIssueReason,
        rawValue,
        gradedValue98,
        valueRange,
        valueConfidence,
        confidenceScore,
        verdict,
        isMissing: ownershipInfo.isMissing,
        ownedCopyCount: ownershipInfo.copyCount,
      };

      // Cache the result
      setCachedResult(issueKey, result);
      
      setScanStage('complete');
      setCurrentResult(result);
      setTotalScans(prev => prev + 1);
      setRecentScans(prev => [result, ...prev].slice(0, 5));
      
      // Trigger feedback based on verdict
      triggerFeedback(verdict, result.isKeyIssue);
      
    } catch (err) {
      console.error('Recognition error:', err);
      const categorized = categorizeError(err);
      setScanError(categorized);
      setScanStage('error');
      vibrate([30, 30, 30]);
    } finally {
      // Don't immediately reset - let the pill show
      setTimeout(() => {
        setProcessing(false);
        if (!currentResult) {
          setScanStage(null);
        }
      }, 500);
    }
  }, [checkIfOwned, setProcessing, triggerFeedback, vibrate, currentResult]);

  // Initialize camera
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Camera init error:', err);
        setCameraError('Could not access camera. Please grant permission and try again.');
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Continuous frame processing loop
  useEffect(() => {
    if (!isInitialized || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    let lastProcessTime = 0;
    const processInterval = 200; // Process every 200ms
    
    const loop = (timestamp: number) => {
      if (timestamp - lastProcessTime >= processInterval) {
        lastProcessTime = timestamp;
        
        // Draw current video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Process frame for stability detection
        processFrame(canvas, ctx, (imageData) => {
          recognizeComic(imageData);
        });
      }
      
      animationRef.current = requestAnimationFrame(loop);
    };
    
    animationRef.current = requestAnimationFrame(loop);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, processFrame, recognizeComic]);

  const handleDismissResult = useCallback(() => {
    setCurrentResult(null);
    setScanStage(null);
    setScanError(null);
    resetStability();
  }, [resetStability]);

  if (cameraError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <XCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-muted-foreground mb-4">{cameraError}</p>
        <Button variant="outline" onClick={onExit}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full min-h-[500px]">
      {/* Camera viewport - takes all available space with explicit min height */}
      <div className="relative flex-1 min-h-[300px] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ minWidth: '100%', minHeight: '100%' }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Loading overlay */}
        {!isInitialized && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Starting camera...</p>
          </div>
        )}
        
        {/* Processing indicator with progress stepper */}
        {isProcessing && scanStage && (
          <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur rounded-lg p-3">
            <ScanProgressStepper currentStage={scanStage} compact />
          </div>
        )}

        {/* Error display */}
        {scanError && !isProcessing && (
          <div className="absolute bottom-4 left-4 right-4">
            <ScanErrorDisplay 
              error={scanError} 
              compact
              onRetry={() => {
                setScanError(null);
                setScanStage(null);
              }}
              onDismiss={() => {
                setScanError(null);
                setScanStage(null);
              }}
            />
          </div>
        )}
        
        {/* Verdict pill overlay */}
        {currentResult && (
          <VerdictPill
            verdict={currentResult.verdict}
            title={currentResult.title}
            issueNumber={currentResult.issueNumber}
            value={currentResult.rawValue}
            gradedValue98={currentResult.gradedValue98}
            valueRange={currentResult.valueRange}
            confidence={currentResult.valueConfidence}
            confidenceScore={currentResult.confidenceScore}
            isKeyIssue={currentResult.isKeyIssue}
            isMissing={currentResult.isMissing}
            ownedCopyCount={currentResult.ownedCopyCount}
            onDismiss={handleDismissResult}
          />
        )}
        
        {/* Rapid fire badge */}
        <div className="absolute top-4 right-4 bg-primary/90 text-primary-foreground rounded-full px-3 py-1 flex items-center gap-1.5 text-sm font-medium">
          <Zap className="w-4 h-4" />
          Rapid Fire
        </div>
      </div>
      
      {/* Stabilization progress */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isProcessing 
              ? 'Analyzing comic...' 
              : stabilityProgress > 0 
                ? 'Hold steady...' 
                : 'Ready for next comic'
            }
          </span>
          <span className="text-muted-foreground">{scanCount} scanned</span>
        </div>
        <Progress value={stabilityProgress * 100} className="h-2" />
      </div>
      
      {/* Recent scans strip */}
      {recentScans.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Recent:</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentScans.map((scan, i) => (
              <div
                key={`${scan.title}-${scan.issueNumber}-${i}`}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border ${
                  scan.verdict === 'get'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : scan.verdict === 'consider'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {scan.title} #{scan.issueNumber}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Exit button */}
      <Button 
        variant="outline" 
        className="w-full mt-4 min-h-[48px]"
        onClick={onExit}
      >
        Exit Rapid Fire
      </Button>
    </div>
  );
}
