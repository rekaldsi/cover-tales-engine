import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { Creators } from './Creators';
import { useComicCollection } from '@/hooks/useComicCollection';
import { Comic } from '@/types/comic';

export default function CreatorsPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  const { comics, addComic, updateComic } = useComicCollection();

  const handleAddComic = async (comic: Omit<Comic, 'id' | 'dateAdded'>) => {
    await addComic(comic);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddClick={() => setScannerOpen(true)} 
        onMenuClick={() => setMobileNavOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      
      <main className="container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-display gradient-text">CREATORS</h1>
          <p className="text-muted-foreground mt-1">
            Explore creators in your collection • Find signing opportunities
          </p>
        </div>
        
        <Creators comics={comics} onUpdateComic={updateComic} />
      </main>

      <ScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
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
