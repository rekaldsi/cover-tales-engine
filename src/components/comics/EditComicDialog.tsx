import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Comic, PUBLISHERS, GradeStatus, GRADE_OPTIONS } from '@/types/comic';

interface EditComicDialogProps {
  comic: Comic;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Comic>) => Promise<void>;
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
  });

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
      });
    }
  }, [comic, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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