import { useState } from 'react';
import { useGoCollectSync } from '@/hooks/useGoCollectSync';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GoCollectImportProps {
  onImportComplete?: () => void;
}

export function GoCollectImport({ onImportComplete }: GoCollectImportProps) {
  const [open, setOpen] = useState(false);
  const { syncCollection, isSyncing, syncProgress, lastSyncResult } = useGoCollectSync();
  const [syncComplete, setSyncComplete] = useState(false);

  const handleSync = async () => {
    setSyncComplete(false);
    const result = await syncCollection();
    
    if (result?.success) {
      setSyncComplete(true);
      onImportComplete?.();
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSyncComplete(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Import from GoCollect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Import from GoCollect
          </DialogTitle>
          <DialogDescription>
            Sync your GoCollect collection to import comics with their Fair Market Values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isSyncing && !syncComplete && (
            <>
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">What will be imported:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All comics in your GoCollect collection</li>
                  <li>• Fair Market Value (FMV) pricing data</li>
                  <li>• Grading information (CGC/CBCS/PGX)</li>
                  <li>• Key issue flags and reasons</li>
                  <li>• Cover images and metadata</li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-200">
                  <strong>Note:</strong> Existing comics will be updated with GoCollect values. 
                  New comics will be added to your collection.
                </p>
              </div>

              <Button 
                onClick={handleSync} 
                className="w-full gap-2"
                disabled={isSyncing}
              >
                <Download className="h-4 w-4" />
                Start Import
              </Button>
            </>
          )}

          {isSyncing && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{syncProgress}</p>
              <p className="text-xs text-muted-foreground">
                This may take a few minutes depending on your collection size...
              </p>
            </div>
          )}

          {syncComplete && lastSyncResult && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Import Complete!</p>
                <p className="text-sm text-muted-foreground">
                  {lastSyncResult.message}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{lastSyncResult.imported}</p>
                  <p className="text-xs text-muted-foreground">New comics</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{lastSyncResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Updated</p>
                </div>
              </div>

              <Button onClick={handleClose} variant="outline" className="mt-4">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
