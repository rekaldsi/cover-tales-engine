import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Comic, ComicEra, GradeStatus, PUBLISHERS, GRADE_OPTIONS, getEraFromDate } from '@/types/comic';
import { Sparkles, DollarSign, Award } from 'lucide-react';

interface AddComicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (comic: Omit<Comic, 'id' | 'dateAdded'>) => void;
}

export function AddComicDialog({ open, onOpenChange, onAdd }: AddComicDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    issueNumber: '',
    publisher: '',
    coverDate: '',
    variant: '',
    writer: '',
    artist: '',
    gradeStatus: 'raw' as GradeStatus,
    grade: '' as string,
    certNumber: '',
    purchasePrice: '',
    currentValue: '',
    isKeyIssue: false,
    keyIssueReason: '',
    notes: '',
    location: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const era = getEraFromDate(formData.coverDate);
    
    onAdd({
      title: formData.title,
      issueNumber: formData.issueNumber,
      publisher: formData.publisher,
      coverDate: formData.coverDate || undefined,
      variant: formData.variant || undefined,
      era,
      writer: formData.writer || undefined,
      artist: formData.artist || undefined,
      gradeStatus: formData.gradeStatus,
      grade: formData.grade as Comic['grade'] || undefined,
      certNumber: formData.certNumber || undefined,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
      isKeyIssue: formData.isKeyIssue,
      keyIssueReason: formData.keyIssueReason || undefined,
      notes: formData.notes || undefined,
      location: formData.location || undefined,
    });
    
    // Reset form
    setFormData({
      title: '',
      issueNumber: '',
      publisher: '',
      coverDate: '',
      variant: '',
      writer: '',
      artist: '',
      gradeStatus: 'raw',
      grade: '',
      certNumber: '',
      purchasePrice: '',
      currentValue: '',
      isKeyIssue: false,
      keyIssueReason: '',
      notes: '',
      location: '',
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl gradient-text">Add to Collection</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder="Amazing Spider-Man"
                  className="mt-1.5"
                />
              </div>
              
              <div>
                <Label htmlFor="issue">Issue # *</Label>
                <Input
                  id="issue"
                  required
                  value={formData.issueNumber}
                  onChange={(e) => setFormData(f => ({ ...f, issueNumber: e.target.value }))}
                  placeholder="300"
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publisher">Publisher *</Label>
                <Select
                  value={formData.publisher}
                  onValueChange={(v) => setFormData(f => ({ ...f, publisher: v }))}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select publisher" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISHERS.map(pub => (
                      <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="coverDate">Cover Date</Label>
                <Input
                  id="coverDate"
                  type="date"
                  value={formData.coverDate}
                  onChange={(e) => setFormData(f => ({ ...f, coverDate: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="variant">Variant (if applicable)</Label>
              <Input
                id="variant"
                value={formData.variant}
                onChange={(e) => setFormData(f => ({ ...f, variant: e.target.value }))}
                placeholder="e.g., Newsstand, 1:25 Variant"
                className="mt-1.5"
              />
            </div>
          </div>
          
          {/* Creators */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Creators
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="writer">Writer</Label>
                <Input
                  id="writer"
                  value={formData.writer}
                  onChange={(e) => setFormData(f => ({ ...f, writer: e.target.value }))}
                  placeholder="Stan Lee"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist</Label>
                <Input
                  id="artist"
                  value={formData.artist}
                  onChange={(e) => setFormData(f => ({ ...f, artist: e.target.value }))}
                  placeholder="Jack Kirby"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          
          {/* Grading */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4 w-4" />
              Grading
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.gradeStatus}
                  onValueChange={(v: GradeStatus) => setFormData(f => ({ ...f, gradeStatus: v }))}
                >
                  <SelectTrigger className="mt-1.5">
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
                    <Label>Grade</Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(v) => setFormData(f => ({ ...f, grade: v }))}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_OPTIONS.map(grade => (
                          <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="certNumber">Cert #</Label>
                    <Input
                      id="certNumber"
                      value={formData.certNumber}
                      onChange={(e) => setFormData(f => ({ ...f, certNumber: e.target.value }))}
                      className="mt-1.5"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Value */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Value
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchasePrice">Purchase Price</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData(f => ({ ...f, purchasePrice: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="currentValue">Current Value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.01"
                  value={formData.currentValue}
                  onChange={(e) => setFormData(f => ({ ...f, currentValue: e.target.value }))}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          
          {/* Key Issue */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <Label htmlFor="keyIssue" className="text-sm font-semibold">Key Issue</Label>
              </div>
              <Switch
                id="keyIssue"
                checked={formData.isKeyIssue}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, isKeyIssue: checked }))}
              />
            </div>
            
            {formData.isKeyIssue && (
              <Input
                value={formData.keyIssueReason}
                onChange={(e) => setFormData(f => ({ ...f, keyIssueReason: e.target.value }))}
                placeholder="e.g., 1st Appearance of Venom"
              />
            )}
          </div>
          
          {/* Notes & Location */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Storage Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(f => ({ ...f, location: e.target.value }))}
                  placeholder="Box A, Binder 3"
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes about this comic..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="hero" className="flex-1">
              Add to Collection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
