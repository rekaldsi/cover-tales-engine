import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Comic, PUBLISHERS, GradeStatus, GRADE_OPTIONS, SignatureType, Signature, SIGNATURE_TYPE_LABELS } from '@/types/comic';
import { DateInput } from '@/components/ui/DateInput';
import { X, Plus } from 'lucide-react';

interface EditComicDialogProps {
  comic: Comic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Comic>) => Promise<void>;
}

const SIGNATURE_TYPES = Object.entries(SIGNATURE_TYPE_LABELS).map(([value, label]) => ({
  value: value as SignatureType,
  label,
}));

function createEmptySignature(): Signature {
  return {
    id: crypto.randomUUID(),
    signedBy: '',
    signedDate: undefined,
    signatureType: 'unverified' as SignatureType,
  };
}

function getInitialSignatures(comic: Comic): Signature[] {
  // Check modern signatures array first
  if (comic.signatures && Array.isArray(comic.signatures) && comic.signatures.length > 0) {
    return comic.signatures;
  }
  
  // Fall back to legacy fields
  if (comic.isSigned && comic.signedBy) {
    return [{
      id: crypto.randomUUID(),
      signedBy: comic.signedBy,
      signedDate: comic.signedDate,
      signatureType: comic.signatureType || 'unverified',
    }];
  }
  
  return [];
}

export function EditComicDialog({ comic, open, onOpenChange, onSave }: EditComicDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    issueNumber: '',
    publisher: '',
    variant: '',
    coverDate: '',
    writer: '',
    artist: '',
    coverArtist: '',
    location: '',
    notes: '',
    isKeyIssue: false,
    keyIssueReason: '',
    gradeStatus: 'raw' as GradeStatus,
    grade: '',
    certNumber: '',
    purchasePrice: '',
    currentValue: '',
    isSigned: false,
  });
  
  const [signatures, setSignatures] = useState<Signature[]>([]);

  // Sync form data when comic changes
  useEffect(() => {
    if (comic && open) {
      setFormData({
        title: comic.title || '',
        issueNumber: comic.issueNumber || '',
        publisher: comic.publisher || '',
        variant: comic.variant || '',
        coverDate: comic.coverDate || '',
        writer: comic.writer || '',
        artist: comic.artist || '',
        coverArtist: comic.coverArtist || '',
        location: comic.location || '',
        notes: comic.notes || '',
        isKeyIssue: comic.isKeyIssue || false,
        keyIssueReason: comic.keyIssueReason || '',
        gradeStatus: comic.gradeStatus || 'raw',
        grade: comic.grade || '',
        certNumber: comic.certNumber || '',
        purchasePrice: comic.purchasePrice?.toString() || '',
        currentValue: comic.currentValue?.toString() || '',
        isSigned: comic.isSigned || false,
      });
      
      const initialSigs = getInitialSignatures(comic);
      setSignatures(initialSigs);
    }
  }, [comic, open]);

  // Suggest creators from the comic
  const suggestedSigners = [
    formData.writer,
    formData.artist,
    formData.coverArtist,
  ].filter((s): s is string => !!s && s.trim() !== '');

  const handleAddSignature = () => {
    setSignatures(prev => [...prev, createEmptySignature()]);
  };

  const handleRemoveSignature = (id: string) => {
    setSignatures(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSignature = (id: string, field: keyof Signature, value: string | undefined) => {
    setSignatures(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Filter out empty signatures
      const validSignatures = signatures.filter(s => s.signedBy?.trim());
      
      const updates: Partial<Comic> = {
        title: formData.title,
        issueNumber: formData.issueNumber,
        publisher: formData.publisher,
        variant: formData.variant || undefined,
        coverDate: formData.coverDate || undefined,
        writer: formData.writer || undefined,
        artist: formData.artist || undefined,
        coverArtist: formData.coverArtist || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        isKeyIssue: formData.isKeyIssue,
        keyIssueReason: formData.isKeyIssue ? formData.keyIssueReason : undefined,
        gradeStatus: formData.gradeStatus,
        grade: formData.gradeStatus !== 'raw' ? formData.grade as any : undefined,
        certNumber: formData.gradeStatus !== 'raw' ? formData.certNumber : undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        // Signature fields
        isSigned: formData.isSigned && validSignatures.length > 0,
        signatures: validSignatures,
        // Also update legacy fields for backward compatibility
        signedBy: validSignatures[0]?.signedBy || undefined,
        signedDate: validSignatures[0]?.signedDate || undefined,
        signatureType: validSignatures[0]?.signatureType || undefined,
      };

      await onSave(updates);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Comic</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="issueNumber">Issue #</Label>
              <Input
                id="issueNumber"
                value={formData.issueNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, issueNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="publisher">Publisher</Label>
              <Select
                value={formData.publisher}
                onValueChange={(value) => setFormData(prev => ({ ...prev, publisher: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select publisher" />
                </SelectTrigger>
                <SelectContent>
                  {PUBLISHERS.map((pub) => (
                    <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Variant & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="variant">Variant</Label>
              <Input
                id="variant"
                value={formData.variant}
                onChange={(e) => setFormData(prev => ({ ...prev, variant: e.target.value }))}
                placeholder="e.g., 1:25 Variant"
              />
            </div>
            <div>
              <Label htmlFor="coverDate">Cover Date</Label>
              <Input
                id="coverDate"
                type="date"
                value={formData.coverDate}
                onChange={(e) => setFormData(prev => ({ ...prev, coverDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Creators */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Creators</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="writer" className="text-xs">Writer</Label>
                <Input
                  id="writer"
                  value={formData.writer}
                  onChange={(e) => setFormData(prev => ({ ...prev, writer: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="artist" className="text-xs">Artist</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(prev => ({ ...prev, artist: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="coverArtist" className="text-xs">Cover Artist</Label>
                <Input
                  id="coverArtist"
                  value={formData.coverArtist}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverArtist: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Grading */}
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider">Grading</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="gradeStatus" className="text-xs">Status</Label>
                <Select
                  value={formData.gradeStatus}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gradeStatus: value as GradeStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw">Raw</SelectItem>
                    <SelectItem value="cgc">CGC</SelectItem>
                    <SelectItem value="cbcs">CBCS</SelectItem>
                    <SelectItem value="pgx">PGX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.gradeStatus !== 'raw' && (
                <>
                  <div>
                    <Label htmlFor="grade" className="text-xs">Grade</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="certNumber" className="text-xs">Cert #</Label>
                    <Input
                      id="certNumber"
                      value={formData.certNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, certNumber: e.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="currentValue">Current Value ($)</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.01"
                value={formData.currentValue}
                onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., Box #3, Shelf A"
            />
          </div>

          {/* Key Issue */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Switch
              id="isKeyIssue"
              checked={formData.isKeyIssue}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isKeyIssue: checked }))}
            />
            <Label htmlFor="isKeyIssue" className="cursor-pointer flex-1">
              Key Issue
            </Label>
          </div>

          {formData.isKeyIssue && (
            <div>
              <Label htmlFor="keyIssueReason">Key Issue Reason</Label>
              <Input
                id="keyIssueReason"
                value={formData.keyIssueReason}
                onChange={(e) => setFormData(prev => ({ ...prev, keyIssueReason: e.target.value }))}
                placeholder="e.g., First appearance of..."
              />
            </div>
          )}

          {/* Signature Section */}
          <div className="space-y-3 p-3 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Switch
                id="isSigned"
                checked={formData.isSigned}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({ ...prev, isSigned: checked }));
                  if (checked && signatures.length === 0) {
                    setSignatures([createEmptySignature()]);
                  }
                }}
              />
              <Label htmlFor="isSigned" className="cursor-pointer flex-1 font-medium">
                Signed
              </Label>
            </div>

            {formData.isSigned && (
              <div className="space-y-3 pt-2">
                {signatures.map((sig, index) => (
                  <div key={sig.id} className="space-y-2 p-2 bg-background/50 rounded border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Signature {index + 1}</span>
                      {signatures.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSignature(sig.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor={`signedBy-${sig.id}`} className="text-xs">Signed By</Label>
                      <Input
                        id={`signedBy-${sig.id}`}
                        value={sig.signedBy || ''}
                        onChange={(e) => handleUpdateSignature(sig.id, 'signedBy', e.target.value)}
                        placeholder="Enter signer's name"
                        list={`signers-${sig.id}`}
                      />
                      {suggestedSigners.length > 0 && (
                        <datalist id={`signers-${sig.id}`}>
                          {suggestedSigners.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <DateInput
                        label="Signature Date"
                        value={sig.signedDate}
                        onChange={(value) => handleUpdateSignature(sig.id, 'signedDate', value)}
                      />

                      <div>
                        <Label className="text-xs">Signature Type</Label>
                        <Select 
                          value={sig.signatureType || 'unverified'} 
                          onValueChange={(v) => handleUpdateSignature(sig.id, 'signatureType', v)}
                        >
                          <SelectTrigger className="bg-background h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {SIGNATURE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSignature}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Signature
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}