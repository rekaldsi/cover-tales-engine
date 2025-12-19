import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, RefreshCw, Loader2, Scan, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface RecognizedComic {
  title: string;
  issueNumber: string;
  publisher: string;
  variant?: string;
  printNumber: number;
  isGraded: boolean;
  gradingCompany?: 'cgc' | 'cbcs' | 'pgx';
  grade?: string;
  certNumber?: string;
  coverDate?: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  confidence: 'high' | 'medium' | 'low';
  isVariant?: boolean;
  userCapturedImage?: string;
}

interface CoverScannerProps {
  onRecognize: (comic: RecognizedComic) => void;
  onError?: (error: string) => void;
}

export function CoverScanner({ onRecognize, onError }: CoverScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameHashRef = useRef<string>('');
  const stableStartRef = useRef<number | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);

  const STABILITY_MS = 800; // Time to hold steady before auto-scan
  const CHANGE_THRESHOLD = 0.15; // Similarity threshold

  // Play a success beep using Web Audio API
  const playSuccessBeep = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      // Create oscillator for beep
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Pleasant success sound: two-tone beep
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (err) {
      console.log('Audio feedback not available:', err);
    }
  }, []);

  // Generate a simple hash from canvas data for comparison
  const generateFrameHash = useCallback((imageData: ImageData): string => {
    const data = imageData.data;
    let hash = 0;
    const step = Math.floor(data.length / 100);
    for (let i = 0; i < data.length; i += step) {
      hash = ((hash << 5) - hash + data[i]) | 0;
    }
    return hash.toString(36);
  }, []);

  // Compare two frames for similarity
  const compareFrames = useCallback((current: ImageData, previous: ImageData): number => {
    if (current.width !== previous.width || current.height !== previous.height) return 0;
    
    let matchingPixels = 0;
    const sampleSize = 1000;
    const step = Math.floor(current.data.length / 4 / sampleSize);
    
    for (let i = 0; i < sampleSize; i++) {
      const idx = i * step * 4;
      const diff = Math.abs(current.data[idx] - previous.data[idx]) +
                   Math.abs(current.data[idx + 1] - previous.data[idx + 1]) +
                   Math.abs(current.data[idx + 2] - previous.data[idx + 2]);
      if (diff < 30) matchingPixels++;
    }
    
    return matchingPixels / sampleSize;
  }, []);

  const previousFrameRef = useRef<ImageData | null>(null);

  // Process a single frame for live scanning
  const processLiveFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const currentHash = generateFrameHash(currentFrame);

    // Check if frame is stable
    if (previousFrameRef.current) {
      const similarity = compareFrames(currentFrame, previousFrameRef.current);
      
      if (similarity >= (1 - CHANGE_THRESHOLD)) {
        // Frame is stable
        if (!stableStartRef.current) {
          stableStartRef.current = Date.now();
        }
        
        const stableDuration = Date.now() - stableStartRef.current;
        const progress = Math.min((stableDuration / STABILITY_MS) * 100, 100);
        setStabilityProgress(progress);

        // If stable long enough and not recently scanned, trigger recognition
        if (stableDuration >= STABILITY_MS && currentHash !== lastFrameHashRef.current) {
          lastFrameHashRef.current = currentHash;
          stableStartRef.current = null;
          setStabilityProgress(0);
          
          // Capture and recognize
          const imageData = canvas.toDataURL('image/jpeg', 0.85);
          setIsProcessing(true);
          
          try {
            const { data, error } = await supabase.functions.invoke('recognize-comic', {
              body: { imageBase64: imageData }
            });

            if (error) throw error;

            if (data.success && data.comic) {
              // Audio and haptic feedback
              playSuccessBeep();
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              
              toast({
                title: 'Comic Recognized!',
                description: `${data.comic.title} #${data.comic.issueNumber}`,
              });
              
              // Stop live scanning and show result
              stopLiveScanning();
              setCapturedImage(imageData);
              onRecognize({
                ...data.comic,
                userCapturedImage: imageData,
              });
            }
          } catch (err) {
            console.error('Live scan recognition error:', err);
            // Don't show error toast on every failed frame, just continue scanning
          } finally {
            setIsProcessing(false);
          }
        }
      } else {
        // Frame changed, reset stability
        stableStartRef.current = null;
        setStabilityProgress(0);
      }
    }

    previousFrameRef.current = currentFrame;
  }, [isProcessing, generateFrameHash, compareFrames, toast, onRecognize]);

  // Start live scanning loop
  const startLiveScanning = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 960 },
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setIsLiveScanning(true);
        lastFrameHashRef.current = '';
        previousFrameRef.current = null;
        stableStartRef.current = null;
      }
    } catch (err) {
      console.error('Camera error:', err);
      onError?.('Failed to access camera');
      toast({
        title: 'Camera Error',
        description: 'Could not access your camera.',
        variant: 'destructive',
      });
    }
  }, [onError, toast]);

  // Live scanning animation loop
  useEffect(() => {
    if (!isLiveScanning || !isStreaming) return;

    const runFrame = async () => {
      await processLiveFrame();
      if (isLiveScanning) {
        animationRef.current = requestAnimationFrame(runFrame);
      }
    };

    // Small delay to let video initialize
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(runFrame);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isLiveScanning, isStreaming, processLiveFrame]);

  const stopLiveScanning = useCallback(() => {
    setIsLiveScanning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopLiveScanning();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    previousFrameRef.current = null;
    stableStartRef.current = null;
    setStabilityProgress(0);
  }, [stopLiveScanning]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1440, min: 960 },
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      onError?.('Failed to access camera');
      toast({
        title: 'Camera Error',
        description: 'Could not access your camera. Try uploading an image instead.',
        variant: 'destructive',
      });
    }
  }, [onError, toast]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCapturedImage(imageData);
    };
    reader.readAsDataURL(file);
  }, []);

  const recognizeComic = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('recognize-comic', {
        body: { imageBase64: capturedImage }
      });

      if (error) {
        throw error;
      }

      if (data.success && data.comic) {
        toast({
          title: 'Comic Recognized!',
          description: `${data.comic.title} #${data.comic.issueNumber}`,
        });
        onRecognize({
          ...data.comic,
          userCapturedImage: capturedImage,
        });
      } else {
        throw new Error(data.error || 'Failed to recognize comic');
      }
    } catch (err) {
      console.error('Recognition error:', err);
      const message = err instanceof Error ? err.message : 'Recognition failed';
      toast({
        title: 'Recognition Failed',
        description: message,
        variant: 'destructive',
      });
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, onRecognize, onError, toast]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="relative w-full">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for gallery/upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      
      {/* Hidden camera input for direct photo capture (mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Preview area */}
      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured comic"
            className="w-full h-full object-contain"
          />
        ) : isStreaming ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Live scan overlay */}
            {isLiveScanning && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Scanning frame indicator */}
                <div className="absolute inset-4 border-2 border-primary/50 rounded-lg" />
                
                {/* Stability progress bar */}
                <div className="absolute bottom-4 left-4 right-4">
                  <Progress 
                    value={stabilityProgress} 
                    className="h-2"
                  />
                  <p className="text-xs text-center mt-2 text-white drop-shadow-lg">
                    {isProcessing ? 'Recognizing...' : 'Hold steady to auto-scan'}
                  </p>
                </div>

                {/* Live indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  LIVE SCAN
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Scan or photograph your comic cover
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {/* Primary: Live Scan - no photo saved */}
              <Button onClick={startLiveScanning} className="w-full min-h-[44px]">
                <Scan className="w-4 h-4 mr-2" />
                Live Scan (No Photo Saved)
              </Button>
              <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="w-full min-h-[44px]">
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full min-h-[44px]">
                <Upload className="w-4 h-4 mr-2" />
                Choose from Gallery
              </Button>
              <Button variant="ghost" onClick={startCamera} className="w-full min-h-[44px] text-muted-foreground">
                Manual Viewfinder
              </Button>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && !isLiveScanning && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing cover...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-4">
        {isLiveScanning && (
          <Button variant="destructive" onClick={stopCamera} className="min-h-[44px]">
            <Square className="w-4 h-4 mr-2" />
            Stop Scanning
          </Button>
        )}

        {isStreaming && !isLiveScanning && (
          <>
            <Button onClick={captureFrame} className="min-h-[44px]">
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
            <Button variant="outline" onClick={stopCamera} className="min-h-[44px]">
              Cancel
            </Button>
          </>
        )}

        {capturedImage && !isProcessing && (
          <>
            <Button onClick={recognizeComic} className="min-h-[44px]">
              Recognize Comic
            </Button>
            <Button variant="outline" onClick={resetCapture} className="min-h-[44px]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retake
            </Button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>AI will identify the comic from the cover</p>
        <p className="text-xs mt-1">Works with raw and graded books</p>
      </div>
    </div>
  );
}
