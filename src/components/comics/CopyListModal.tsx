import { Comic, ERA_LABELS } from '@/types/comic';
import { ComicGroup } from '@/hooks/useGroupedComics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Award, PenTool, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CopyListModalProps {
  group: ComicGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCopy: (comic: Comic) => void;
}

export function CopyListModal({ group, open, onOpenChange, onSelectCopy }: CopyListModalProps) {
  if (!group) return null;
  
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const totalValue = formatCurrency(group.totalValue);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="truncate">{group.title} #{group.issueNumber}</span>
            <Badge variant="secondary" className="shrink-0">
              {group.copies.length} copies
            </Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Total value: <span className="font-semibold text-accent">{totalValue}</span>
          </p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-4">
            {group.copies.map((comic, index) => (
              <CopyListItem 
                key={comic.id} 
                comic={comic} 
                copyNumber={index + 1}
                totalCopies={group.copies.length}
                onClick={() => {
                  onOpenChange(false);
                  onSelectCopy(comic);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface CopyListItemProps {
  comic: Comic;
  copyNumber: number;
  totalCopies: number;
  onClick: () => void;
}

function CopyListItem({ comic, copyNumber, totalCopies, onClick }: CopyListItemProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const getGradeLabel = () => {
    if (comic.gradeStatus === 'raw') {
      return comic.estimatedRawGrade ? `Est. ${comic.estimatedRawGrade}` : 'Raw';
    }
    return `${comic.gradeStatus.toUpperCase()} ${comic.grade || ''}`;
  };
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 cursor-pointer transition-all"
    >
      {/* Thumbnail */}
      <div className="w-12 h-16 rounded bg-secondary flex-shrink-0 overflow-hidden">
        {comic.coverImage ? (
          <img src={comic.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            #{comic.issueNumber}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Copy {copyNumber} of {totalCopies}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5">
          {comic.gradeStatus !== 'raw' ? (
            <Badge variant="default" className="text-xs px-1.5 py-0 h-5">
              <Award className="h-3 w-3 mr-1" />
              {getGradeLabel()}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
              <FileText className="h-3 w-3 mr-1" />
              {getGradeLabel()}
            </Badge>
          )}
          
          {comic.isSigned && (
            <Badge className="text-xs px-1.5 py-0 h-5 bg-comic-green text-white">
              <PenTool className="h-3 w-3 mr-1" />
              Signed
            </Badge>
          )}
        </div>
        
        {comic.location && (
          <p className="text-xs text-muted-foreground truncate">
            📍 {comic.location}
          </p>
        )}
      </div>
      
      {/* Value */}
      <div className="text-right shrink-0">
        <p className="font-semibold text-accent">{formatCurrency(comic.currentValue)}</p>
      </div>
    </div>
  );
}
