import { Link, useLocation } from "react-router-dom";
import { ChefHat, BookOpen, Home } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  return (
    <nav className="sticky top-0 z-50 glass border-b border-stone-200/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-3 group"
            data-testid="logo-link"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold text-foreground hidden sm:block">
              Cooking Capture
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive('/') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
              data-testid="nav-home"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
            
            <Link
              to="/directory"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                isActive('/directory') 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
              data-testid="nav-directory"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Mes Recettes</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
