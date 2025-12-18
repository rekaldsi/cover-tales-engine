import { Home, Library, TrendingUp, Users, PenTool, X, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const location = useLocation();
  
  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      <nav className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 lg:hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-display text-xl gradient-text">MENU</span>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-2">
          <MobileNavLink 
            to="/" 
            icon={Home} 
            active={location.pathname === '/'} 
            onClick={onClose}
          >
            Dashboard
          </MobileNavLink>
          <MobileNavLink 
            to="/collection" 
            icon={Library} 
            active={location.pathname === '/collection'} 
            onClick={onClose}
          >
            Collection
          </MobileNavLink>
          <MobileNavLink 
            to="/creators" 
            icon={Users} 
            active={location.pathname === '/creators'} 
            onClick={onClose}
          >
            Creators
          </MobileNavLink>
          <MobileNavLink 
            to="/signings" 
            icon={PenTool} 
            active={location.pathname === '/signings'} 
            onClick={onClose}
          >
            Signing Planner
          </MobileNavLink>
          <MobileNavLink 
            to="/insights" 
            icon={TrendingUp} 
            active={location.pathname === '/insights'} 
            onClick={onClose}
          >
            Insights
          </MobileNavLink>
          
          <div className="pt-4 border-t border-border mt-4">
            <div className="px-4 py-2 text-xs text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </div>
            <MobileNavLink 
              to="#lookup" 
              icon={Search} 
              active={false} 
              onClick={onClose}
            >
              Quick Lookup
            </MobileNavLink>
          </div>
        </div>
      </nav>
    </>
  );
}

interface MobileNavLinkProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function MobileNavLink({ to, icon: Icon, active, onClick, children }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active 
          ? 'bg-primary/10 text-primary' 
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <Icon className="h-5 w-5" />
      {children}
    </Link>
  );
}
