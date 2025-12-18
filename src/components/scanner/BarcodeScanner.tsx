import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string, format: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const startScanning = useCallback(async (deviceId?: string) => {
    if (!videoRef.current) return;

    try {
      // Configure reader with hints for better UPC detection
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      // Get available video devices
      const videoDevices = await reader.listVideoInputDevices();
      setDevices(videoDevices);

      // Prefer back camera on mobile
      const targetDevice = deviceId || 
        videoDevices.find(d => d.label.toLowerCase().includes('back'))?.deviceId ||
        videoDevices[0]?.deviceId;

      if (targetDevice) {
        setSelectedDevice(targetDevice);
      }

      setIsScanning(true);
      setHasPermission(true);

      // Start continuous scanning
      await reader.decodeFromVideoDevice(
        targetDevice,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText();
            const format = result.getBarcodeFormat().toString();
            console.log('Barcode detected:', text, format);
            onScan(text, format);
          }
          // Ignore errors during continuous scanning (they're mostly "not found yet")
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setHasPermission(false);
      onError?.('Failed to access camera. Please grant camera permissions.');
    }
  }, [onScan, onError]);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const switchCamera = useCallback(() => {
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex]?.deviceId;
    
    if (nextDevice) {
      stopScanning();
      setTimeout(() => startScanning(nextDevice), 100);
    }
  }, [devices, selectedDevice, stopScanning, startScanning]);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  if (hasPermission === false) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Camera className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">Camera access denied</p>
        <Button onClick={() => startScanning()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Video preview */}
      <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scan line animation */}
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
            
            {/* Corner markers */}
            <div className="absolute top-1/4 left-1/4 w-8 h-8 border-l-2 border-t-2 border-primary" />
            <div className="absolute top-1/4 right-1/4 w-8 h-8 border-r-2 border-t-2 border-primary" />
            <div className="absolute bottom-1/4 left-1/4 w-8 h-8 border-l-2 border-b-2 border-primary" />
            <div className="absolute bottom-1/4 right-1/4 w-8 h-8 border-r-2 border-b-2 border-primary" />
          </div>
        )}

        {/* Loading state */}
        {!isScanning && hasPermission === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Ready to scan</p>
              <Button onClick={() => startScanning()}>
                <Camera className="w-4 h-4 mr-2" />
                Start Scanner
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {isScanning && (
        <div className="flex justify-center gap-2 mt-4">
          {devices.length > 1 && (
            <Button variant="outline" size="sm" onClick={switchCamera}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Switch Camera
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={stopScanning}>
            Stop
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <p>Position the barcode within the frame</p>
        <p className="text-xs mt-1">Supports UPC, EAN, QR codes</p>
      </div>
    </div>
  );
}
