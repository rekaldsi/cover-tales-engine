import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Comic, ERA_LABELS } from '@/types/comic';
import { Star, Award, Calendar, User, MapPin, Trash2, ExternalLink } from 'lucide-react';

interface ComicDetailSheetProps {
  comic: Comic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export function ComicDetailSheet({ comic, open, onOpenChange, onDelete }: ComicDetailSheetProps) {
  if (!comic) return null;
  
  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };
  
  const profit = comic.currentValue && comic.purchasePrice 
    ? comic.currentValue - comic.purchasePrice 
    : null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
        <SheetHeader className="sr-only">
          <SheetTitle>{comic.title} #{comic.issueNumber}</SheetTitle>
        </SheetHeader>
        
        {/* Cover Image */}
        <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary -mx-2 mb-6">
          {comic.coverImage ? (
            <img 
              src={comic.coverImage} 
              alt={`${comic.title} #${comic.issueNumber}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
              <div className="text-center p-4">
                <p className="font-display text-3xl text-muted-foreground">{comic.title}</p>
                <p className="text-5xl font-display text-primary">#{comic.issueNumber}</p>
              </div>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            {comic.isKeyIssue && (
              <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg">
                <Star className="h-3 w-3 fill-current" />
                KEY ISSUE
              </Badge>
            )}
            {comic.grade && (
              <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm shadow-lg ml-auto">
                <Award className="h-3 w-3 mr-1" />
                {comic.gradeStatus.toUpperCase()} {comic.grade}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Title */}
        <div className="space-y-1 mb-6">
          <h2 className="font-display text-4xl tracking-tight text-foreground">
            {comic.title}
          </h2>
          <p className="text-xl text-muted-foreground">
            #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
          </p>
          <div className="flex items-center gap-2 pt-2">
            <span className={`era-badge era-${comic.era}`}>
              {ERA_LABELS[comic.era]}
            </span>
            <span className="text-sm text-muted-foreground">{comic.publisher}</span>
          </div>
        </div>
        
        {/* Key Issue Reason */}
        {comic.isKeyIssue && comic.keyIssueReason && (
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 mb-6">
            <p className="text-sm font-medium text-accent">
              <Star className="h-4 w-4 inline mr-2" />
              {comic.keyIssueReason}
            </p>
          </div>
        )}
        
        {/* Value Section */}
        {(comic.currentValue || comic.purchasePrice) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {comic.currentValue && (
              <div className="stat-card">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
                <p className="text-2xl font-display gold-text">{formatCurrency(comic.currentValue)}</p>
              </div>
            )}
            {comic.purchasePrice && (
              <div className="stat-card">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p>
                <p className="text-2xl font-display text-foreground">{formatCurrency(comic.purchasePrice)}</p>
              </div>
            )}
            {profit !== null && (
              <div className="col-span-2 stat-card">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit/Loss</p>
                <p className={`text-2xl font-display ${profit >= 0 ? 'text-comic-green' : 'text-destructive'}`}>
                  {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Details */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
          
          <div className="space-y-3">
            {comic.coverDate && (
              <DetailRow icon={Calendar} label="Cover Date" value={formatDate(comic.coverDate)} />
            )}
            {comic.writer && (
              <DetailRow icon={User} label="Writer" value={comic.writer} />
            )}
            {comic.artist && (
              <DetailRow icon={User} label="Artist" value={comic.artist} />
            )}
            {comic.location && (
              <DetailRow icon={MapPin} label="Location" value={comic.location} />
            )}
            {comic.certNumber && (
              <DetailRow 
                icon={ExternalLink} 
                label="Cert #" 
                value={comic.certNumber}
                isLink
              />
            )}
          </div>
        </div>
        
        {/* Notes */}
        {comic.notes && (
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
            <p className="text-sm text-foreground/80">{comic.notes}</p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1">
            Edit
          </Button>
          <Button 
            variant="destructive" 
            size="icon"
            onClick={() => {
              onDelete(comic.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Added {formatDate(comic.dateAdded)}
        </p>
      </SheetContent>
    </Sheet>
  );
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  isLink?: boolean;
}

function DetailRow({ icon: Icon, label, value, isLink }: DetailRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      {isLink ? (
        <a href="#" className="text-primary hover:underline">{value}</a>
      ) : (
        <span className="text-foreground">{value}</span>
      )}
    </div>
  );
}
