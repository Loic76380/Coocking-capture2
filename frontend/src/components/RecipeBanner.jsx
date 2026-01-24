import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChefHat, ExternalLink, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecipeBanner = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const autoScrollRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadPublicRecipes();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (recipes.length <= 1 || isPaused) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        if (scrollRef.current && !isPaused) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          const maxScroll = scrollWidth - clientWidth;
          
          if (scrollLeft >= maxScroll - 10) {
            scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
          }
        }
      }, 3000);
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [recipes.length, isPaused]);

  const loadPublicRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes/public/recent`);
      setRecipes(response.data.recipes || []);
    } catch (error) {
      console.error("Error loading public recipes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 250;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const handleRecipeClick = (recipe) => {
    // For URL recipes, open original source
    if (recipe.source_type === "url" && recipe.source_url) {
      window.open(recipe.source_url, "_blank");
    } else {
      // For manual/shared recipes, go to public recipe page
      navigate(`/public/recipe/${recipe.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-r from-primary/5 via-white to-primary/5 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-32 h-10 bg-stone-200 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show banner even with no recipes
  if (recipes.length === 0) {
    return (
      <div className="w-full bg-gradient-to-r from-amber-50/80 via-white to-orange-50/80 border-b border-stone-200/60 shadow-sm" data-testid="recipe-banner">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                  Recettes partagées
                </span>
                <span className="text-[10px] text-stone-500">
                  Communauté culinaire
                </span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-stone-500 italic">
                Soyez le premier à partager une recette ! Rendez vos recettes publiques pour les voir ici.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-gradient-to-r from-amber-50/80 via-white to-orange-50/80 border-b border-stone-200/60 shadow-sm" 
      data-testid="recipe-banner"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 py-2 sm:py-2.5">
          {/* Title - Tablet+ */}
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0 pr-3 border-r border-stone-200/80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                Dernières recettes
              </span>
              <span className="text-[10px] text-stone-500">
                {recipes.length} partagée{recipes.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Mobile Title */}
          <div className="sm:hidden flex items-center gap-1.5 flex-shrink-0 pr-2 border-r border-stone-200/80">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <ChefHat className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] font-medium text-stone-600">{recipes.length}</span>
          </div>

          {/* Scroll Left Button */}
          <button
            onClick={() => scroll('left')}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-full bg-white/80 shadow-sm border border-stone-200 hover:bg-white hover:shadow transition-all flex-shrink-0"
            aria-label="Défiler à gauche"
          >
            <ChevronLeft className="w-4 h-4 text-stone-600" />
          </button>

          {/* Scrollable Recipe List */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-2 sm:gap-2.5">
              {recipes.map((recipe, index) => (
                <button
                  key={recipe.id}
                  onClick={() => handleRecipeClick(recipe)}
                  className="group flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/90 backdrop-blur-sm rounded-full border border-stone-200/80 hover:border-primary/40 hover:bg-white hover:shadow-md transition-all flex-shrink-0"
                  data-testid={`banner-recipe-${index}`}
                >
                  {/* Photo - Tablet+ */}
                  <div className="hidden sm:block w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 flex-shrink-0 ring-2 ring-white shadow-sm">
                    {recipe.image_url ? (
                      <img
                        src={`${BACKEND_URL}${recipe.image_url}`}
                        alt={recipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-sm">🍽️</span>
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-medium text-foreground truncate max-w-[80px] sm:max-w-[110px] group-hover:text-primary transition-colors">
                      {recipe.title}
                    </span>
                    <span className="text-[10px] text-stone-500 truncate max-w-[80px] sm:max-w-[110px]">
                      par {recipe.user_name}
                    </span>
                  </div>

                  {/* Action Icon - Tablet+ */}
                  <div className="hidden sm:flex w-6 h-6 items-center justify-center rounded-full bg-stone-100/80 group-hover:bg-primary/10 transition-colors flex-shrink-0">
                    {recipe.source_type === "url" ? (
                      <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-primary" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-stone-400 group-hover:text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scroll('right')}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-full bg-white/80 shadow-sm border border-stone-200 hover:bg-white hover:shadow transition-all flex-shrink-0"
            aria-label="Défiler à droite"
          >
            <ChevronRight className="w-4 h-4 text-stone-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeBanner;
