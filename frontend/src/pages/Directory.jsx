import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Users, Trash2, ExternalLink, BookOpen, ChefHat, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Directory = () => {
  const { getAllFilters } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  
  const allFilters = getAllFilters();

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await axios.get(`${API}/recipes`);
      setRecipes(response.data);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      toast.error("Erreur lors du chargement des recettes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recipeId, recipeTitle) => {
    try {
      await axios.delete(`${API}/recipes/${recipeId}`);
      setRecipes(recipes.filter(r => r.id !== recipeId));
      toast.success(`"${recipeTitle}" supprimée`);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const resetFilters = () => {
    setActiveFilters([]);
  };

  const filteredRecipes = useMemo(() => {
    if (activeFilters.length === 0) return recipes;
    return recipes.filter(recipe => 
      activeFilters.some(filterId => recipe.tags?.includes(filterId))
    );
  }, [recipes, activeFilters]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getFilterById = (filterId) => {
    return allFilters.find(f => f.id === filterId);
  };

  // Group filters by row
  const row1Filters = allFilters.filter(f => f.row === 1);
  const row2Filters = allFilters.filter(f => f.row === 2);
  const row3Filters = allFilters.filter(f => f.row === 3); // Custom filters

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Chargement des recettes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8" data-testid="directory-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Mes Recettes
              </h1>
              <p className="text-sm text-stone-600">
                {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? 's' : ''}
                {activeFilters.length > 0 && ` (${recipes.length} au total)`}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-6 space-y-3" data-testid="filters-section">
          {/* Row 1: Apéro, Entrées, Plats, Desserts */}
          <div className="flex flex-wrap gap-2">
            {row1Filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilters.includes(filter.id)
                    ? 'text-white shadow-md scale-105'
                    : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
                }`}
                style={activeFilters.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                data-testid={`filter-${filter.id}`}
              >
                {filter.name}
              </button>
            ))}
          </div>

          {/* Row 2: Salé, Sucré, Viande, Poisson + Reset */}
          <div className="flex flex-wrap gap-2 items-center">
            {row2Filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeFilters.includes(filter.id)
                    ? 'text-white shadow-md scale-105'
                    : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
                }`}
                style={activeFilters.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                data-testid={`filter-${filter.id}`}
              >
                {filter.name}
              </button>
            ))}
            
            {activeFilters.length > 0 && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-full text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all flex items-center gap-1"
                data-testid="reset-filters"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Row 3: Custom filters */}
          {row3Filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {row3Filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeFilters.includes(filter.id)
                      ? 'text-white shadow-md scale-105'
                      : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-300'
                  }`}
                  style={activeFilters.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                  data-testid={`filter-${filter.id}`}
                >
                  {filter.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty State */}
        {recipes.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <ChefHat className="w-10 h-10 text-stone-400" />
            </div>
            <h2 className="text-xl font-serif font-semibold text-foreground mb-2">
              Aucune recette
            </h2>
            <p className="text-stone-600 mb-6">
              Commencez par capturer votre première recette
            </p>
            <Button asChild className="rounded-full">
              <Link to="/" data-testid="add-first-recipe-btn">
                Ajouter une recette
              </Link>
            </Button>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16" data-testid="no-results">
            <p className="text-stone-600 mb-4">
              Aucune recette ne correspond aux filtres sélectionnés
            </p>
            <Button variant="outline" onClick={resetFilters} className="rounded-full">
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          /* Recipe Grid - Smaller tiles */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="recipe-card group relative bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                data-testid={`recipe-card-${recipe.id}`}
              >
                {/* Image placeholder - smaller */}
                <div className="h-24 bg-gradient-to-br from-primary/10 to-secondary/30 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-primary/30" />
                  </div>
                  
                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-btn-${recipe.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{recipe.title}" sera définitivement supprimée.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(recipe.id, recipe.title)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Content - compact */}
                <div className="p-3">
                  <Link 
                    to={`/recipe/${recipe.id}`}
                    className="block"
                    data-testid={`recipe-link-${recipe.id}`}
                  >
                    <h3 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {recipe.title}
                    </h3>
                  </Link>

                  {/* Tags */}
                  {recipe.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recipe.tags.slice(0, 2).map((tagId) => {
                        const filter = getFilterById(tagId);
                        if (!filter) return null;
                        return (
                          <span
                            key={tagId}
                            className="px-2 py-0.5 rounded-full text-xs text-white"
                            style={{ backgroundColor: filter.color }}
                          >
                            {filter.name}
                          </span>
                        );
                      })}
                      {recipe.tags.length > 2 && (
                        <span className="text-xs text-stone-400">+{recipe.tags.length - 2}</span>
                      )}
                    </div>
                  )}

                  {/* Meta - minimal */}
                  <div className="flex items-center justify-between mt-2 text-xs text-stone-400">
                    {recipe.prep_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {recipe.prep_time.replace(' minutes', 'min')}
                      </span>
                    )}
                    <span>{formatDate(recipe.created_at)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Directory;
