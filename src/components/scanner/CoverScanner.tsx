import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  isKeyIssue: boolean;
  keyIssueReason?: string;
  confidence: 'high' | 'medium' | 'low';
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
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 960 },
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

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
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
        onRecognize(data.comic);
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

  return (
    <div className="relative w-full">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Hidden file input for gallery/upload (no capture) */}
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
          // Show captured/uploaded image
          <img
            src={capturedImage}
            alt="Captured comic"
            className="w-full h-full object-contain"
          />
        ) : isStreaming ? (
          // Show camera stream
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          // Initial state
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Take a photo of your comic cover
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <Button onClick={() => cameraInputRef.current?.click()} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Choose from Gallery
              </Button>
              <Button variant="ghost" onClick={startCamera} className="w-full text-muted-foreground">
                Use Live Viewfinder
              </Button>
            </div>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
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
        {isStreaming && (
          <>
            <Button onClick={captureFrame}>
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
            <Button variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
          </>
        )}

        {capturedImage && !isProcessing && (
          <>
            <Button onClick={recognizeComic}>
              Recognize Comic
            </Button>
            <Button variant="outline" onClick={resetCapture}>
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
