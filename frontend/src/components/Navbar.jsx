import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChefHat, BookOpen, Home, User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_EMAIL = "loicchampanay@gmail.com";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };
  
  return (
    <nav className="sticky top-0 z-50 glass border-b border-stone-200/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 group"
            data-testid="logo-link"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <ChefHat className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-serif text-lg font-semibold text-foreground hidden sm:block">
              Cooking Capture
            </span>
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    isActive('/directory') 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                  data-testid="nav-directory"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Mes Recettes</span>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                      data-testid="user-menu-trigger"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-stone-700">
                        {user?.name?.split(' ')[0]}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="flex items-center gap-2" data-testid="nav-account">
                        <User className="w-4 h-4" />
                        Mon compte
                      </Link>
                    </DropdownMenuItem>
                    {user?.email === ADMIN_EMAIL && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2" data-testid="nav-admin">
                          <Shield className="w-4 h-4" />
                          Administration
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-destructive focus:text-destructive"
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild className="rounded-full h-9 px-4" data-testid="login-btn">
                <Link to="/auth">
                  Connexion
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
