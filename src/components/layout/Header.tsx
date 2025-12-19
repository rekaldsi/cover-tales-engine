import { Plus, Search, Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { KodexLogo } from '@/components/brand/KodexLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onAddClick: () => void;
  onMenuClick: () => void;
  onSearchClick?: () => void;
}

export function Header({ onAddClick, onMenuClick, onSearchClick }: HeaderProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };
  
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
              <KodexLogo className="h-8 w-8" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-2xl tracking-wide gradient-text">
                KØDEX
              </h1>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <NavLink to="/" active={location.pathname === '/'}>Dashboard</NavLink>
          <NavLink to="/collection" active={location.pathname === '/collection'}>Collection</NavLink>
          <NavLink to="/creators" active={location.pathname === '/creators'}>Creators</NavLink>
          <NavLink to="/insights" active={location.pathname === '/insights'}>Insights</NavLink>
          <NavLink to="/signings" active={location.pathname === '/signings'}>Signings</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden sm:flex"
            onClick={onSearchClick}
          >
            <Search className="h-5 w-5" />
          </Button>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground bg-secondary rounded">
            <span className="text-xs">⌘</span>K
          </kbd>
          <Button variant="hero" onClick={onAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Comic</span>
          </Button>
          
          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                  {user.email}
                </div>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
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
