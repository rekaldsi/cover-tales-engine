import { useState, useMemo, useEffect } from 'react';
import { useComicCollection } from '@/hooks/useComicCollection';
import { useGroupedComics, ComicGroup } from '@/hooks/useGroupedComics';
import { ComicCard } from '@/components/comics/ComicCard';
import { GroupedComicCard } from '@/components/comics/GroupedComicCard';
import { CopyListModal } from '@/components/comics/CopyListModal';
import { ComicDetailModal } from '@/components/comics/ComicDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Comic, ComicEra, ERA_LABELS, PUBLISHERS } from '@/types/comic';
import { Grid3X3, List, Search, Filter, SlidersHorizontal, Download, Layers } from 'lucide-react';
import { exportToCSV, exportToJSON } from '@/utils/exportCollection';

type ViewMode = 'grid' | 'list';
type SortOption = 'dateAdded' | 'title' | 'value' | 'issue';

const GROUPED_VIEW_KEY = 'comic-collection-grouped-view';

export default function Collection() {
  const { comics, deleteComic, updateComic } = useComicCollection();
  const { groupedComics, duplicateCount } = useGroupedComics(comics);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ComicGroup | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isGrouped, setIsGrouped] = useState(() => {
    const saved = localStorage.getItem(GROUPED_VIEW_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [filterEra, setFilterEra] = useState<ComicEra | 'all'>('all');
  const [filterPublisher, setFilterPublisher] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Persist grouped view preference
  useEffect(() => {
    localStorage.setItem(GROUPED_VIEW_KEY, JSON.stringify(isGrouped));
  }, [isGrouped]);
  
  const filteredAndSortedComics = useMemo(() => {
    let result = [...comics];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.issueNumber.includes(query) ||
        c.writer?.toLowerCase().includes(query) ||
        c.artist?.toLowerCase().includes(query)
      );
    }
    
    // Filter by era
    if (filterEra !== 'all') {
      result = result.filter(c => c.era === filterEra);
    }
    
    // Filter by publisher
    if (filterPublisher !== 'all') {
      result = result.filter(c => c.publisher === filterPublisher);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'value':
          return (b.currentValue || 0) - (a.currentValue || 0);
        case 'issue':
          return parseInt(a.issueNumber) - parseInt(b.issueNumber);
        case 'dateAdded':
        default:
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      }
    });
    
    return result;
  }, [comics, searchQuery, sortBy, filterEra, filterPublisher]);
  
  // Filter grouped comics based on search/filters
  const filteredGroupedComics = useMemo(() => {
    let result = [...groupedComics];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.title.toLowerCase().includes(query) ||
        g.issueNumber.includes(query) ||
        g.copies.some(c => 
          c.writer?.toLowerCase().includes(query) ||
          c.artist?.toLowerCase().includes(query)
        )
      );
    }
    
    // Filter by era
    if (filterEra !== 'all') {
      result = result.filter(g => g.highestValueCopy.era === filterEra);
    }
    
    // Filter by publisher
    if (filterPublisher !== 'all') {
      result = result.filter(g => g.publisher === filterPublisher);
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'value':
          return b.totalValue - a.totalValue;
        case 'issue':
          return parseInt(a.issueNumber) - parseInt(b.issueNumber);
        case 'dateAdded':
        default:
          return new Date(b.highestValueCopy.dateAdded).getTime() - new Date(a.highestValueCopy.dateAdded).getTime();
      }
    });
    
    return result;
  }, [groupedComics, searchQuery, sortBy, filterEra, filterPublisher]);
  
  const handleGroupClick = (group: ComicGroup) => {
    if (group.copies.length === 1) {
      // Single copy, go straight to detail
      setSelectedComic(group.copies[0]);
    } else {
      // Multiple copies, show copy list
      setSelectedGroup(group);
    }
  };
  
  const displayCount = isGrouped ? filteredGroupedComics.length : filteredAndSortedComics.length;
  const totalCount = isGrouped ? groupedComics.length : comics.length;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Collection</h1>
          <p className="text-muted-foreground">
            {displayCount} of {totalCount} {isGrouped ? 'issues' : 'comics'}
            {isGrouped && duplicateCount > 0 && (
              <span className="ml-1 text-xs">({duplicateCount} with multiple copies)</span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => v === 'csv' ? exportToCSV(comics) : exportToJSON(comics)}>
            <SelectTrigger className="w-auto gap-2 min-h-[44px]">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">Export CSV</SelectItem>
              <SelectItem value="json">Export JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search titles, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
        
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-card border border-border animate-scale-in">
            {/* Group toggle */}
            <div className="flex items-center gap-2 mr-4">
              <Switch
                id="group-duplicates"
                checked={isGrouped}
                onCheckedChange={setIsGrouped}
              />
              <Label htmlFor="group-duplicates" className="flex items-center gap-1.5 cursor-pointer">
                <Layers className="h-4 w-4" />
                <span className="text-sm">Group duplicates</span>
              </Label>
            </div>
            
            <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateAdded">Recently Added</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="value">Highest Value</SelectItem>
                <SelectItem value="issue">Issue Number</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterEra} onValueChange={(v: ComicEra | 'all') => setFilterEra(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Era" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Eras</SelectItem>
                {Object.entries(ERA_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterPublisher} onValueChange={setFilterPublisher}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Publisher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Publishers</SelectItem>
                {PUBLISHERS.map(pub => (
                  <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(filterEra !== 'all' || filterPublisher !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterEra('all');
                  setFilterPublisher('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Comics Grid/List */}
      {(isGrouped ? filteredGroupedComics.length : filteredAndSortedComics.length) === 0 ? (
        <div className="text-center py-16">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">No comics found</h3>
          <p className="text-muted-foreground">
            {searchQuery || filterEra !== 'all' || filterPublisher !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first comic to get started'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-full">
          {isGrouped ? (
            // Grouped view
            filteredGroupedComics.map((group, index) => (
              <div 
                key={group.key}
                className="animate-fade-in w-full min-w-0"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
              >
                <GroupedComicCard group={group} onClick={() => handleGroupClick(group)} />
              </div>
            ))
          ) : (
            // Individual view
            filteredAndSortedComics.map((comic, index) => (
              <div 
                key={comic.id}
                className="animate-fade-in w-full min-w-0"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
              >
                <ComicCard comic={comic} onClick={() => setSelectedComic(comic)} />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {isGrouped ? (
            // Grouped list view
            filteredGroupedComics.map((group, index) => (
              <GroupedListItem 
                key={group.key} 
                group={group} 
                onClick={() => handleGroupClick(group)}
                style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
              />
            ))
          ) : (
            // Individual list view
            filteredAndSortedComics.map((comic, index) => (
              <ComicListItem 
                key={comic.id} 
                comic={comic} 
                onClick={() => setSelectedComic(comic)}
                style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
              />
            ))
          )}
        </div>
      )}
      
      {/* Copy List Modal */}
      <CopyListModal
        group={selectedGroup}
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
        onSelectCopy={setSelectedComic}
      />
      
      {/* Detail Modal */}
      <ComicDetailModal
        comic={selectedComic}
        open={!!selectedComic}
        onOpenChange={(open) => !open && setSelectedComic(null)}
        onDelete={deleteComic}
        onUpdate={updateComic}
      />
    </div>
  );
}

interface ComicListItemProps {
  comic: Comic;
  onClick: () => void;
  style?: React.CSSProperties;
}

function ComicListItem({ comic, onClick, style }: ComicListItemProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 cursor-pointer transition-all animate-fade-in"
      style={style}
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
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{comic.title}</h3>
          <span className="text-muted-foreground">#{comic.issueNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{comic.publisher}</span>
          <span>•</span>
          <span className={`era-badge era-${comic.era} text-xs`}>
            {ERA_LABELS[comic.era]}
          </span>
        </div>
      </div>
      
      {/* Value */}
      <div className="text-right hidden sm:block">
        <p className="font-semibold gold-text">{formatCurrency(comic.currentValue)}</p>
        {comic.grade && (
          <p className="text-xs text-muted-foreground">
            {comic.gradeStatus.toUpperCase()} {comic.grade}
          </p>
        )}
      </div>
    </div>
  );
}

interface GroupedListItemProps {
  group: ComicGroup;
  onClick: () => void;
  style?: React.CSSProperties;
}

function GroupedListItem({ group, onClick, style }: GroupedListItemProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const mainComic = group.highestValueCopy;
  
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/30 cursor-pointer transition-all animate-fade-in relative"
      style={style}
    >
      {/* Copy count badge */}
      {group.copies.length > 1 && (
        <div className="absolute -top-1.5 -left-1.5 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-md z-10">
          <Layers className="h-3 w-3" />
          ×{group.copies.length}
        </div>
      )}
      
      {/* Thumbnail */}
      <div className="w-12 h-16 rounded bg-secondary flex-shrink-0 overflow-hidden">
        {mainComic.coverImage ? (
          <img src={mainComic.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            #{mainComic.issueNumber}
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{group.title}</h3>
          <span className="text-muted-foreground">#{group.issueNumber}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{group.publisher}</span>
          <span>•</span>
          <span className={`era-badge era-${mainComic.era} text-xs`}>
            {ERA_LABELS[mainComic.era]}
          </span>
          {group.copies.length > 1 && (
            <>
              <span>•</span>
              <span className="text-xs">
                {group.hasGraded && 'Graded'}
                {group.hasGraded && group.hasRaw && ' + '}
                {group.hasRaw && 'Raw'}
                {group.hasSigned && ' • Signed'}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Value */}
      <div className="text-right hidden sm:block">
        <p className="font-semibold gold-text">{formatCurrency(group.totalValue)}</p>
        <p className="text-xs text-muted-foreground">
          {group.copies.length > 1 ? 'total' : mainComic.gradeStatus.toUpperCase()}
          {group.copies.length === 1 && mainComic.grade && ` ${mainComic.grade}`}
        </p>
      </div>
    </div>
  );
}
