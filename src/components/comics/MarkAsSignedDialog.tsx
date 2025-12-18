import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Comic, SignatureType } from '@/types/comic';

interface MarkAsSignedDialogProps {
  comic: Comic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signedBy: string, signedDate: string, signatureType: SignatureType) => void;
}

const SIGNATURE_TYPES: { value: SignatureType; label: string; description: string }[] = [
  { value: 'witnessed', label: 'Witnessed', description: 'Signed in your presence' },
  { value: 'cgc_ss', label: 'CGC Signature Series', description: 'Witnessed by CGC representative' },
  { value: 'cbcs_verified', label: 'CBCS Verified', description: 'Witnessed by CBCS representative' },
  { value: 'unverified', label: 'Unverified', description: 'Signature obtained without witness' },
];

export function MarkAsSignedDialog({ comic, open, onOpenChange, onSave }: MarkAsSignedDialogProps) {
  const [signedBy, setSignedBy] = useState(comic.signedBy || '');
  const [signedDate, setSignedDate] = useState<Date | undefined>(
    comic.signedDate ? new Date(comic.signedDate) : undefined
  );
  const [signatureType, setSignatureType] = useState<SignatureType>(
    comic.signatureType || 'witnessed'
  );

  // Suggest creators from the comic
  const suggestedSigners = [
    comic.writer,
    comic.artist,
    comic.coverArtist,
  ].filter((s): s is string => !!s && s.trim() !== '');

  const handleSave = () => {
    if (!signedBy.trim()) return;
    onSave(
      signedBy.trim(),
      signedDate ? format(signedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      signatureType
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Mark as Signed
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Signed By */}
          <div className="space-y-2">
            <Label htmlFor="signedBy">Signed By</Label>
            <Input
              id="signedBy"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Enter signer's name"
            />
            {suggestedSigners.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedSigners.map((signer) => (
                  <Button
                    key={signer}
                    variant="outline"
                    size="sm"
                    onClick={() => setSignedBy(signer)}
                    className="text-xs"
                  >
                    {signer}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Signature Date */}
          <div className="space-y-2">
            <Label>Signature Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !signedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {signedDate ? format(signedDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={signedDate}
                  onSelect={setSignedDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Signature Type */}
          <div className="space-y-2">
            <Label>Signature Type</Label>
            <Select value={signatureType} onValueChange={(v) => setSignatureType(v as SignatureType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNATURE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!signedBy.trim()}>
            Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
