import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Comic, LabelType, PageQuality, LABEL_TYPE_CONFIG, PAGE_QUALITY_LABELS, GradeStatus } from '@/types/comic';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GradingDetailsFormProps {
  comic: Comic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Comic>) => Promise<void>;
}

// Get relevant label types for each grading company
function getLabelTypesForGrader(gradeStatus: GradeStatus): LabelType[] {
  switch (gradeStatus) {
    case 'cgc':
      return ['universal', 'signature_series', 'qualified', 'restored', 'conserved'];
    case 'cbcs':
      return ['universal', 'cbcs_verified_sig', 'cbcs_red_label', 'restored'];
    case 'pgx':
      return ['pgx_standard', 'restored'];
    default:
      return [];
  }
}

export function GradingDetailsForm({ comic, open, onOpenChange, onSave }: GradingDetailsFormProps) {
  const [labelType, setLabelType] = useState<LabelType | undefined>(comic.labelType);
  const [pageQuality, setPageQuality] = useState<PageQuality | undefined>(comic.pageQuality);
  const [graderNotes, setGraderNotes] = useState(comic.graderNotes || '');
  const [gradedDate, setGradedDate] = useState<Date | undefined>(
    comic.gradedDate ? new Date(comic.gradedDate) : undefined
  );
  const [innerWellNotes, setInnerWellNotes] = useState(comic.innerWellNotes || '');
  const [isLoading, setIsLoading] = useState(false);

  const availableLabelTypes = getLabelTypesForGrader(comic.gradeStatus);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({
        labelType,
        pageQuality,
        graderNotes: graderNotes || undefined,
        gradedDate: gradedDate ? gradedDate.toISOString().split('T')[0] : undefined,
        innerWellNotes: innerWellNotes || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {comic.gradeStatus.toUpperCase()} Grading Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label Type */}
          <div className="space-y-2">
            <Label htmlFor="labelType">Label Type</Label>
            <Select 
              value={labelType} 
              onValueChange={(value) => setLabelType(value as LabelType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select label type" />
              </SelectTrigger>
              <SelectContent>
                {availableLabelTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {LABEL_TYPE_CONFIG[type].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page Quality */}
          <div className="space-y-2">
            <Label htmlFor="pageQuality">Page Quality</Label>
            <Select 
              value={pageQuality} 
              onValueChange={(value) => setPageQuality(value as PageQuality)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select page quality" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAGE_QUALITY_LABELS) as PageQuality[]).map((quality) => (
                  <SelectItem key={quality} value={quality}>
                    {PAGE_QUALITY_LABELS[quality]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Graded Date */}
          <div className="space-y-2">
            <Label>Date Graded</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !gradedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {gradedDate ? format(gradedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={gradedDate}
                  onSelect={setGradedDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Grader Notes */}
          <div className="space-y-2">
            <Label htmlFor="graderNotes">Grader Notes</Label>
            <Textarea
              id="graderNotes"
              placeholder="e.g., Light spine stress, small color touch on cover..."
              value={graderNotes}
              onChange={(e) => setGraderNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Inner Well Notes */}
          <div className="space-y-2">
            <Label htmlFor="innerWellNotes">Inner Well Condition</Label>
            <Input
              id="innerWellNotes"
              placeholder="e.g., Newton rings present, slight case crack..."
              value={innerWellNotes}
              onChange={(e) => setInnerWellNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Details'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
