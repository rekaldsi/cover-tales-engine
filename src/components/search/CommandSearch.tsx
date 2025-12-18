import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Book, User, Building, Search, Sparkles } from 'lucide-react';
import { Comic } from '@/types/comic';
import { useCreators } from '@/hooks/useCreators';

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comics: Comic[];
  onSelectComic?: (comic: Comic) => void;
}

export function CommandSearch({ open, onOpenChange, comics, onSelectComic }: CommandSearchProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { creators, searchCreators } = useCreators(comics);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  // Filter results
  const filteredComics = comics.filter((comic) => {
    if (!search) return false;
    const lowerSearch = search.toLowerCase();
    return (
      comic.title.toLowerCase().includes(lowerSearch) ||
      comic.issueNumber.toLowerCase().includes(lowerSearch) ||
      `${comic.title} #${comic.issueNumber}`.toLowerCase().includes(lowerSearch)
    );
  }).slice(0, 5);

  const filteredCreators = searchCreators(search).slice(0, 5);

  const publishers = [...new Set(comics.map((c) => c.publisher))].filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 3);

  const handleSelectComic = useCallback((comic: Comic) => {
    onOpenChange(false);
    setSearch('');
    onSelectComic?.(comic);
  }, [onOpenChange, onSelectComic]);

  const handleSelectCreator = useCallback((creatorName: string) => {
    onOpenChange(false);
    setSearch('');
    navigate(`/creators?search=${encodeURIComponent(creatorName)}`);
  }, [navigate, onOpenChange]);

  const handleSelectPublisher = useCallback((publisher: string) => {
    onOpenChange(false);
    setSearch('');
    navigate(`/collection?publisher=${encodeURIComponent(publisher)}`);
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search comics, creators, publishers..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No results found.</p>
          </div>
        </CommandEmpty>

        {!search && (
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => { onOpenChange(false); navigate('/'); }}>
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => { onOpenChange(false); navigate('/collection'); }}>
              <Book className="mr-2 h-4 w-4 text-primary" />
              <span>Browse Collection</span>
            </CommandItem>
            <CommandItem onSelect={() => { onOpenChange(false); navigate('/creators'); }}>
              <User className="mr-2 h-4 w-4 text-primary" />
              <span>View Creators</span>
            </CommandItem>
          </CommandGroup>
        )}

        {search && filteredComics.length > 0 && (
          <CommandGroup heading="Comics">
            {filteredComics.map((comic) => (
              <CommandItem
                key={comic.id}
                value={`comic-${comic.id}`}
                onSelect={() => handleSelectComic(comic)}
              >
                <Book className="mr-2 h-4 w-4 text-comic-blue" />
                <div className="flex flex-col">
                  <span className="font-medium">{comic.title} #{comic.issueNumber}</span>
                  <span className="text-xs text-muted-foreground">{comic.publisher}</span>
                </div>
                {comic.isKeyIssue && (
                  <span className="ml-auto text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                    KEY
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {search && filteredCreators.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Creators">
              {filteredCreators.map((creator) => (
                <CommandItem
                  key={creator.name}
                  value={`creator-${creator.name}`}
                  onSelect={() => handleSelectCreator(creator.name)}
                >
                  <User className="mr-2 h-4 w-4 text-comic-purple" />
                  <div className="flex flex-col">
                    <span className="font-medium">{creator.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {creator.comicCount} comic{creator.comicCount !== 1 ? 's' : ''} • {creator.roles.join(', ')}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {search && publishers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Publishers">
              {publishers.map((publisher) => (
                <CommandItem
                  key={publisher}
                  value={`publisher-${publisher}`}
                  onSelect={() => handleSelectPublisher(publisher)}
                >
                  <Building className="mr-2 h-4 w-4 text-comic-green" />
                  <span>{publisher}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
