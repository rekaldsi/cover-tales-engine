import { useState, useCallback } from 'react';
import { useCSVImport, ColumnMapping } from '@/hooks/useCSVImport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, 
  AlertCircle, Loader2, CheckCircle2, XCircle 
} from 'lucide-react';

const COMIC_FIELDS = [
  { value: 'title', label: 'Title', required: true },
  { value: 'issue_number', label: 'Issue Number' },
  { value: 'volume', label: 'Volume' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'writer', label: 'Writer' },
  { value: 'artist', label: 'Artist' },
  { value: 'cover_artist', label: 'Cover Artist' },
  { value: 'grade', label: 'Grade' },
  { value: 'grade_status', label: 'Grade Status (raw/cgc/cbcs)' },
  { value: 'current_value', label: 'Current Value' },
  { value: 'purchase_price', label: 'Purchase Price' },
  { value: 'purchase_date', label: 'Purchase Date' },
  { value: 'is_key_issue', label: 'Is Key Issue' },
  { value: 'key_issue_reason', label: 'Key Issue Reason' },
  { value: 'is_signed', label: 'Is Signed' },
  { value: 'signed_by', label: 'Signed By' },
  { value: 'cert_number', label: 'Cert Number' },
  { value: 'notes', label: 'Notes' },
  { value: 'location', label: 'Location' },
  { value: 'cover_date', label: 'Cover Date' },
  { value: 'era', label: 'Era' },
  { value: 'variant_type', label: 'Variant Type' },
];

interface CSVImportWizardProps {
  onComplete?: () => void;
}

export function CSVImportWizard({ onComplete }: CSVImportWizardProps) {
  const [open, setOpen] = useState(false);
  const {
    step,
    setStep,
    isLoading,
    job,
    rows,
    mappings,
    error,
    uploadFile,
    analyzeColumns,
    updateMapping,
    startImport,
    reset,
  } = useCSVImport();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleClose = () => {
    setOpen(false);
    if (step === 'complete') {
      reset();
      onComplete?.();
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return <Badge variant="default" className="bg-comic-green">High</Badge>;
    if (confidence >= 50) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const hasTitleMapping = mappings.some(m => m.comicField === 'title');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Comics from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-4 border-b border-border">
          {['upload', 'preview', 'mapping', 'importing', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`
                h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s ? 'bg-primary text-primary-foreground' : 
                  ['upload', 'preview', 'mapping', 'importing', 'complete'].indexOf(step) > i 
                    ? 'bg-comic-green text-white' : 'bg-secondary text-muted-foreground'}
              `}>
                {['upload', 'preview', 'mapping', 'importing', 'complete'].indexOf(step) > i ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && <div className="w-8 h-0.5 bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden py-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display text-xl mb-2">Upload CSV File</h3>
              <p className="text-muted-foreground mb-6">
                Drag and drop your CSV file here, or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild disabled={isLoading}>
                  <span>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Select File'
                    )}
                  </span>
                </Button>
              </label>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && job && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{job.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.totalRows} rows · {job.detectedColumns.length} columns
                    </p>
                  </div>
                  <Badge variant="secondary">Ready to analyze</Badge>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Detected Columns</h4>
                <div className="flex flex-wrap gap-2">
                  {job.detectedColumns.map(col => (
                    <Badge key={col} variant="outline">{col}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Sample Data (first 3 rows)</h4>
                <ScrollArea className="h-40 rounded-lg border border-border">
                  <div className="p-3 text-sm font-mono">
                    {rows.slice(0, 3).map((row, i) => (
                      <div key={i} className="mb-2 p-2 bg-secondary/30 rounded">
                        {Object.entries(row).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="truncate">{value || '—'}</span>
                          </div>
                        ))}
                        {Object.keys(row).length > 4 && (
                          <span className="text-muted-foreground">...and {Object.keys(row).length - 4} more fields</span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={reset}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={analyzeColumns} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Columns
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the AI-suggested column mappings below. Adjust any incorrect mappings before importing.
              </p>

              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {mappings.map((mapping) => (
                    <div key={mapping.csvColumn} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{mapping.csvColumn}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {mapping.sampleValues.slice(0, 2).join(', ') || 'No sample values'}
                        </p>
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={mapping.comicField || 'skip'}
                          onValueChange={(value) => updateMapping(mapping.csvColumn, value === 'skip' ? null : value)}
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Skip this column</SelectItem>
                            {COMIC_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label} {field.required && '*'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {mapping.comicField && getConfidenceBadge(mapping.confidence)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {!hasTitleMapping && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">A Title column mapping is required to import comics.</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={startImport} disabled={isLoading || !hasTitleMapping}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Start Import
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && job && (
            <div className="space-y-6 text-center py-8">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="font-display text-xl mb-2">Importing Comics...</h3>
                <p className="text-muted-foreground">
                  Processing {job.totalRows} rows. This may take a moment.
                </p>
              </div>
              <Progress value={(job.processedRows / job.totalRows) * 100} className="max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground">
                {job.processedRows} of {job.totalRows} processed
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && job && (
            <div className="space-y-6 text-center py-8">
              <CheckCircle2 className="h-16 w-16 mx-auto text-comic-green" />
              <div>
                <h3 className="font-display text-xl mb-2">Import Complete!</h3>
                <p className="text-muted-foreground">
                  Your comics have been added to your collection.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-display">{job.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-4 rounded-lg bg-comic-green/10 border border-comic-green/20">
                  <p className="text-2xl font-display text-comic-green">{job.successfulRows}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-2xl font-display text-destructive">{job.failedRows}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>

              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 mt-4">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
