import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ScannerDialog } from '@/components/scanner/ScannerDialog';
import { useComicCollection } from '@/hooks/useComicCollection';
import Dashboard from './Dashboard';

export default function Index() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { addComic } = useComicCollection();
  
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddClick={() => setIsScannerOpen(true)}
        onMenuClick={() => setIsMobileNavOpen(true)}
      />
      
      <MobileNav 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      
      <main className="container py-6 pb-20">
        <Dashboard />
      </main>
      
      <ScannerDialog
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onAdd={addComic}
      />
    </div>
  );
}
