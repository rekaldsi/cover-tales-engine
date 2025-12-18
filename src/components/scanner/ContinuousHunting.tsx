import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Camera, XCircle, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { VerdictPill } from './VerdictPill';
import { useContinuousScan } from '@/hooks/useContinuousScan';
import { useHuntingFeedback } from '@/hooks/useHuntingFeedback';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Comic } from '@/types/comic';

type Verdict = 'get' | 'consider' | 'pass' | null;

interface HuntingResult {
  title: string;
  issueNumber: string;
  publisher: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  rawValue?: number;
  verdict: Verdict;
  isMissing: boolean;
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
  
  const { toast } = useToast();
  const { triggerFeedback, playChaChing, vibrate } = useHuntingFeedback();
  const {
    stabilityProgress,
    isProcessing,
    processFrame,
    setProcessing,
    resetStability,
  } = useContinuousScan({
    stabilizationMs: 1200,
    changeThreshold: 0.12,
  });

  // Check if comic is in collection
  const checkIfOwned = useCallback((title: string, issueNumber: string) => {
    return ownedComics.some(
      c => c.title.toLowerCase() === title.toLowerCase() && 
           c.issueNumber === issueNumber
    );
  }, [ownedComics]);

  // Recognize and lookup comic
  const recognizeComic = useCallback(async (imageData: ImageData) => {
    setProcessing(true);
    
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
      
      // Call AI recognition
      const { data: recognizeData, error: recognizeError } = await supabase.functions.invoke('recognize-comic', {
        body: { image: base64Image }
      });
      
      if (recognizeError) throw recognizeError;
      
      if (!recognizeData?.title) {
        // Could not recognize - short feedback and continue
        vibrate([30, 30, 30]);
        setProcessing(false);
        return;
      }
      
      // Fetch value data
      let rawValue: number | undefined;
      
      try {
        const { data: valueData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: recognizeData.title,
            issueNumber: recognizeData.issueNumber,
            publisher: recognizeData.publisher,
          }
        });
        
        if (valueData?.success) {
          rawValue = valueData.fmv?.['2.0'] || valueData.fmv?.['4.0'];
        }
      } catch {
        console.log('Value lookup failed, continuing without value');
      }
      
      const isMissing = !checkIfOwned(recognizeData.title, recognizeData.issueNumber);
      const verdict = getVerdict(rawValue, recognizeData.isKeyIssue, recognizeData.issueNumber);
      
      const result: HuntingResult = {
        title: recognizeData.title,
        issueNumber: recognizeData.issueNumber,
        publisher: recognizeData.publisher || 'Unknown',
        coverImageUrl: recognizeData.coverImageUrl,
        isKeyIssue: recognizeData.isKeyIssue || false,
        keyIssueReason: recognizeData.keyIssueReason,
        rawValue,
        verdict,
        isMissing,
      };
      
      setCurrentResult(result);
      setTotalScans(prev => prev + 1);
      setRecentScans(prev => [result, ...prev].slice(0, 5));
      
      // Trigger feedback based on verdict
      triggerFeedback(verdict, result.isKeyIssue);
      
    } catch (err) {
      console.error('Recognition error:', err);
      vibrate([30, 30, 30]);
    } finally {
      // Don't immediately reset - let the pill show
      setTimeout(() => {
        setProcessing(false);
      }, 500);
    }
  }, [checkIfOwned, setProcessing, triggerFeedback, vibrate]);

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
    <div className="relative">
      {/* Camera viewport */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
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
        
        {/* Processing indicator */}
        {isProcessing && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm">Analyzing...</span>
          </div>
        )}
        
        {/* Verdict pill overlay */}
        {currentResult && (
          <VerdictPill
            verdict={currentResult.verdict}
            title={currentResult.title}
            issueNumber={currentResult.issueNumber}
            value={currentResult.rawValue}
            isKeyIssue={currentResult.isKeyIssue}
            isMissing={currentResult.isMissing}
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
