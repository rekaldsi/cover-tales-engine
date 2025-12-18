import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { AddComicDialog } from '@/components/comics/AddComicDialog';
import { CommandSearch } from '@/components/search/CommandSearch';
import { useComicCollection } from '@/hooks/useComicCollection';
import SigningPlanner from './SigningPlanner';

export default function SigningPlannerPage() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { comics, addComic } = useComicCollection();

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSearchClick={() => setSearchOpen(true)}
        onAddClick={() => setAddDialogOpen(true)}
        onMenuClick={() => setMobileNavOpen(true)}
      />
      
      <MobileNav 
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      
      <main className="container max-w-6xl mx-auto px-4 pt-20 pb-24">
        <SigningPlanner />
      </main>
      
      <ScannerDialog 
        open={scannerOpen} 
        onOpenChange={setScannerOpen}
        onAdd={addComic}
      />
      
      <AddComicDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
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
