import { Book, Plus, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onAddClick: () => void;
  onMenuClick: () => void;
}

export function Header({ onAddClick, onMenuClick }: HeaderProps) {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-border/30">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <Link to="/" className="flex items-center gap-2">
            <div className="relative">
              <Book className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-2xl tracking-wide gradient-text">
                COMICVAULT
              </h1>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={location.pathname === '/'}>Dashboard</NavLink>
          <NavLink to="/collection" active={location.pathname === '/collection'}>Collection</NavLink>
          <NavLink to="/insights" active={location.pathname === '/insights'}>Insights</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="hero" onClick={onAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Comic</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-primary/10 text-primary' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </Link>
  );
}
