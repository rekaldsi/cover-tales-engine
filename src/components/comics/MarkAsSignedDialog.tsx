import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenTool, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Comic, SignatureType, Signature, SIGNATURE_TYPE_LABELS } from '@/types/comic';
import { DateInput } from '@/components/ui/DateInput';

interface MarkAsSignedDialogProps {
  comic: Comic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatures: Signature[]) => void;
}

const SIGNATURE_TYPES: { value: SignatureType; label: string; description: string }[] = [
  { value: 'witnessed', label: 'Witnessed', description: 'Signed in your presence' },
  { value: 'cgc_ss', label: 'CGC Signature Series', description: 'Witnessed by CGC representative' },
  { value: 'cbcs_verified', label: 'CBCS Verified', description: 'Witnessed by CBCS representative' },
  { value: 'unverified', label: 'Unverified', description: 'Signature obtained without witness' },
];

// Generate a simple unique ID
function generateId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function MarkAsSignedDialog({ comic, open, onOpenChange, onSave }: MarkAsSignedDialogProps) {
  // Initialize with existing signatures or create one from legacy fields
  const getInitialSignatures = (): Signature[] => {
    if (comic.signatures && comic.signatures.length > 0) {
      return comic.signatures;
    }
    if (comic.isSigned && comic.signedBy) {
      return [{
        id: generateId(),
        signedBy: comic.signedBy,
        signedDate: comic.signedDate,
        signatureType: comic.signatureType || 'witnessed',
      }];
    }
    return [{
      id: generateId(),
      signedBy: '',
      signedDate: format(new Date(), 'yyyy-MM-dd'),
      signatureType: 'witnessed',
    }];
  };

  const [signatures, setSignatures] = useState<Signature[]>(getInitialSignatures);

  // Suggest creators from the comic
  const suggestedSigners = [
    comic.writer,
    comic.artist,
    comic.coverArtist,
  ].filter((s): s is string => !!s && s.trim() !== '');

  const handleAddSignature = () => {
    setSignatures(prev => [...prev, {
      id: generateId(),
      signedBy: '',
      signedDate: format(new Date(), 'yyyy-MM-dd'),
      signatureType: 'witnessed',
    }]);
  };

  const handleRemoveSignature = (id: string) => {
    setSignatures(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSignature = (id: string, updates: Partial<Signature>) => {
    setSignatures(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const handleSave = () => {
    const validSignatures = signatures.filter(s => s.signedBy.trim());
    if (validSignatures.length === 0) return;
    onSave(validSignatures);
    onOpenChange(false);
  };

  const hasValidSignature = signatures.some(s => s.signedBy.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            {comic.isSigned ? 'Edit Signatures' : 'Add Signatures'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {signatures.map((signature, index) => (
            <div key={signature.id} className="space-y-4 p-4 rounded-lg bg-secondary/30 border border-border relative">
              {signatures.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveSignature(signature.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Signature {index + 1}
              </div>

              {/* Signed By */}
              <div className="space-y-2">
                <Label htmlFor={`signedBy-${signature.id}`}>Signed By</Label>
                <Input
                  id={`signedBy-${signature.id}`}
                  value={signature.signedBy}
                  onChange={(e) => handleUpdateSignature(signature.id, { signedBy: e.target.value })}
                  placeholder="Enter signer's name"
                />
                {suggestedSigners.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {suggestedSigners.map((signer) => (
                      <Button
                        key={signer}
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateSignature(signature.id, { signedBy: signer })}
                        className="text-xs"
                      >
                        {signer}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Signature Date */}
              <DateInput
                label="Signature Date"
                value={signature.signedDate || format(new Date(), 'yyyy-MM-dd')}
                onChange={(date) => handleUpdateSignature(signature.id, { signedDate: date })}
              />

              {/* Signature Type */}
              <div className="space-y-2">
                <Label>Signature Type</Label>
                <Select 
                  value={signature.signatureType} 
                  onValueChange={(v) => handleUpdateSignature(signature.id, { signatureType: v as SignatureType })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
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
          ))}

          {/* Add Another Signature */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleAddSignature}
          >
            <Plus className="h-4 w-4" />
            Add Another Signature
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasValidSignature}>
            Save {signatures.filter(s => s.signedBy.trim()).length} Signature{signatures.filter(s => s.signedBy.trim()).length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
