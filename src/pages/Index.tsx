import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { HuntingMode } from '@/components/scanner/HuntingMode';
import { HuntingModeFAB } from '@/components/scanner/HuntingModeFAB';
import { useComicCollection } from '@/hooks/useComicCollection';
import Dashboard from './Dashboard';

export default function Index() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [huntingOpen, setHuntingOpen] = useState(false);
  const { comics, addComic } = useComicCollection();
  
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddClick={() => setIsScannerOpen(true)}
        onMenuClick={() => setIsMobileNavOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      
      <MobileNav 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onHuntingClick={() => setHuntingOpen(true)}
      />
      
      <main className="container py-6 pb-20">
        <Dashboard 
          onAddClick={() => setIsScannerOpen(true)} 
          onHuntingClick={() => setHuntingOpen(true)}
        />
      </main>
      
      <ScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAdd={addComic}
      />

      <CommandSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        comics={comics}
      />

      <HuntingMode
        open={huntingOpen}
        onOpenChange={setHuntingOpen}
        onAddToCollection={addComic}
        ownedComics={comics}
      />

      {comics.length > 0 && <HuntingModeFAB onClick={() => setHuntingOpen(true)} />}
    </div>
  );
}
