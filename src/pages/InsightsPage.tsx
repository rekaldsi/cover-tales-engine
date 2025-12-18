import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { AddComicDialog } from '@/components/comics/AddComicDialog';
import { useComicCollection } from '@/hooks/useComicCollection';
import Insights from './Insights';
import { useToast } from '@/hooks/use-toast';

export default function InsightsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { addComic } = useComicCollection();
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
      />
      
      <MobileNav 
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
      
      <main className="container py-6 pb-20">
        <Insights />
      </main>
      
      <AddComicDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddComic}
      />
    </div>
  );
}
