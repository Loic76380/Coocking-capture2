import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Users, Trash2, ExternalLink, BookOpen, ChefHat } from "lucide-react";
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
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

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
    <div className="min-h-[calc(100vh-64px)] py-12" data-testid="directory-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground">
                Mes Recettes
              </h1>
              <p className="text-stone-600">
                {recipes.length} recette{recipes.length !== 1 ? 's' : ''} sauvegardée{recipes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {recipes.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-muted empty-state-bg" />
              <div className="absolute inset-0 rounded-full bg-muted flex items-center justify-center">
                <ChefHat className="w-12 h-12 text-stone-400" />
              </div>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">
              Aucune recette pour le moment
            </h2>
            <p className="text-stone-600 mb-8 max-w-md mx-auto">
              Commencez à capturer vos recettes préférées en collant une URL sur la page d'accueil
            </p>
            <Button asChild className="rounded-full px-6">
              <Link to="/" data-testid="add-first-recipe-btn">
                Ajouter ma première recette
              </Link>
            </Button>
          </div>
        ) : (
          /* Recipe Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 stagger-children" data-testid="recipe-grid">
            {recipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="recipe-card group relative bg-white border border-stone-100 rounded-2xl overflow-hidden shadow-soft"
                data-testid={`recipe-card-${recipe.id}`}
              >
                {/* Image placeholder with gradient */}
                <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/30 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="w-12 h-12 text-primary/30" />
                  </div>
                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-btn-${recipe.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette recette ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{recipe.title}" sera définitivement supprimée. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(recipe.id, recipe.title)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid={`confirm-delete-${recipe.id}`}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Content */}
                <div className="p-6">
                  <Link 
                    to={`/recipe/${recipe.id}`}
                    className="block"
                    data-testid={`recipe-link-${recipe.id}`}
                  >
                    <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {recipe.title}
                    </h3>
                  </Link>
                  
                  {recipe.description && (
                    <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                      {recipe.description}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-stone-500 mb-4">
                    {recipe.prep_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {recipe.prep_time}
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {recipe.servings}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    <span className="text-xs text-stone-400">
                      {formatDate(recipe.created_at)}
                    </span>
                    <a
                      href={recipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                      data-testid={`source-link-${recipe.id}`}
                    >
                      Source
                      <ExternalLink className="w-3 h-3" />
                    </a>
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
