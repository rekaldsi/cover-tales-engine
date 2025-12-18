import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { AddComicDialog } from '@/components/comics/AddComicDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { useComicCollection } from '@/hooks/useComicCollection';
import Collection from './Collection';
import { useToast } from '@/hooks/use-toast';

export default function CollectionPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { comics, addComic } = useComicCollection();
  const { toast } = useToast();
  
  const handleAddComic = (comic: Parameters<typeof addComic>[0]) => {
    addComic(comic);
    toast({
      title: "Comic Added!",
      description: `${comic.title} #${comic.issueNumber} has been added to your collection.`,
    });
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddClick={() => setIsAddDialogOpen(true)}
        onMenuClick={() => setIsMobileNavOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      
      <MobileNav 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      
      <main className="container py-6 pb-20">
        <Collection />
      </main>
      
      <AddComicDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddComic}
      />

      <CommandSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        comics={comics}
      />
    </div>
  );
}
