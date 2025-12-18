import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { useComicCollection } from '@/hooks/useComicCollection';
import Insights from './Insights';

export default function InsightsPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { comics, addComic } = useComicCollection();
  
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddClick={() => setScannerOpen(true)}
        onMenuClick={() => setIsMobileNavOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      
      <MobileNav 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      
      <main className="container py-6 pb-20">
        <Insights />
      </main>
      
      <ScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onAdd={addComic}
      />

      <CommandSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        comics={comics}
      />
    </div>
  );
}
