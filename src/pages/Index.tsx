import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { QuickLookup } from '@/components/lookup/QuickLookup';
import { QuickLookupFAB } from '@/components/lookup/QuickLookupFAB';
import { useComicCollection } from '@/hooks/useComicCollection';
import Dashboard from './Dashboard';

export default function Index() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
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
      />
      
      <main className="container py-6 pb-20">
        <Dashboard onAddClick={() => setIsScannerOpen(true)} />
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

      <QuickLookup
        open={lookupOpen}
        onOpenChange={setLookupOpen}
      />

      <QuickLookupFAB onClick={() => setLookupOpen(true)} />
    </div>
  );
}
