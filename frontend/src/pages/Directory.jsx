import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Clock, Users, Trash2, ExternalLink, BookOpen, ChefHat, X, Plus, FileText, Globe, PenLine } from "lucide-react";
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
  const { getAllFilters, user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Update page title
  useEffect(() => {
    if (user?.name) {
      document.title = `La boîte à recettes de ${user.name} | Cooking Capture`;
    }
    return () => {
      document.title = 'Cooking Capture';
    };
  }, [user]);

const Directory = () => {
  const { getAllFilters, user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New recipe form
  const [newRecipe, setNewRecipe] = useState({
    title: "",
    description: "",
    prep_time: "",
    cook_time: "",
    servings: "",
    ingredientsText: "",
    stepsText: ""
  });
  
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

  const parseIngredients = (text) => {
    if (!text.trim()) return [];
    return text.split('\n').filter(line => line.trim()).map(line => {
      // Try to parse "quantity unit ingredient" format
      const match = line.match(/^(\d+[\d.,\/]*)\s*(\w+)?\s+(.+)$/);
      if (match) {
        return { quantity: match[1], unit: match[2] || "", name: match[3] };
      }
      return { quantity: "", unit: "", name: line.trim() };
    });
  };

  const parseSteps = (text) => {
    if (!text.trim()) return [];
    return text.split('\n').filter(line => line.trim()).map((line, index) => {
      // Remove leading numbers/dots if present
      const instruction = line.replace(/^\d+[\.\)]\s*/, '').trim();
      return { step_number: index + 1, instruction };
    });
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    
    if (!newRecipe.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setIsCreating(true);

    try {
      const recipeData = {
        title: newRecipe.title.trim(),
        description: newRecipe.description.trim() || null,
        prep_time: newRecipe.prep_time.trim() || null,
        cook_time: newRecipe.cook_time.trim() || null,
        servings: newRecipe.servings.trim() || null,
        ingredients: parseIngredients(newRecipe.ingredientsText),
        steps: parseSteps(newRecipe.stepsText),
        tags: []
      };

      const response = await axios.post(`${API}/recipes/manual`, recipeData);
      setRecipes([response.data, ...recipes]);
      toast.success("Recette créée !");
      setIsCreateDialogOpen(false);
      setNewRecipe({
        title: "",
        description: "",
        prep_time: "",
        cook_time: "",
        servings: "",
        ingredientsText: "",
        stepsText: ""
      });
    } catch (error) {
      console.error("Error creating recipe:", error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsCreating(false);
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
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getFilterById = (filterId) => allFilters.find(f => f.id === filterId);

  const getSourceIcon = (recipe) => {
    if (recipe.source_type === "manual") return <PenLine className="w-3 h-3" />;
    if (recipe.source_type === "document") return <FileText className="w-3 h-3" />;
    return <Globe className="w-3 h-3" />;
  };

  const row1Filters = allFilters.filter(f => f.row === 1);
  const row2Filters = allFilters.filter(f => f.row === 2);
  const row3Filters = allFilters.filter(f => f.row === 3);

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                La boîte à recettes de {user?.name || 'vous'}
              </h1>
              <p className="text-sm text-stone-600">
                {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? 's' : ''}
                {activeFilters.length > 0 && ` (${recipes.length} au total)`}
              </p>
            </div>
          </div>
          
          {/* Create Recipe Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full" data-testid="create-recipe-btn">
                <Plus className="w-4 h-4 mr-2" />
                Créer une recette
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Nouvelle Recette</DialogTitle>
                <DialogDescription>
                  Créez votre propre recette manuellement
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateRecipe} className="space-y-4 mt-4" data-testid="create-recipe-form">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Tarte aux pommes de mamie"
                      value={newRecipe.title}
                      onChange={(e) => setNewRecipe({...newRecipe, title: e.target.value})}
                      data-testid="recipe-title-input"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Courte description de la recette"
                      value={newRecipe.description}
                      onChange={(e) => setNewRecipe({...newRecipe, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="prep_time">Temps de préparation</Label>
                    <Input
                      id="prep_time"
                      placeholder="Ex: 30 minutes"
                      value={newRecipe.prep_time}
                      onChange={(e) => setNewRecipe({...newRecipe, prep_time: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cook_time">Temps de cuisson</Label>
                    <Input
                      id="cook_time"
                      placeholder="Ex: 45 minutes"
                      value={newRecipe.cook_time}
                      onChange={(e) => setNewRecipe({...newRecipe, cook_time: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="servings">Portions</Label>
                    <Input
                      id="servings"
                      placeholder="Ex: 4 personnes"
                      value={newRecipe.servings}
                      onChange={(e) => setNewRecipe({...newRecipe, servings: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ingredients">Ingrédients (un par ligne)</Label>
                  <Textarea
                    id="ingredients"
                    placeholder={"200 g farine\n3 oeufs\n100 g sucre\n1 pincée sel"}
                    value={newRecipe.ingredientsText}
                    onChange={(e) => setNewRecipe({...newRecipe, ingredientsText: e.target.value})}
                    className="min-h-[120px] font-mono text-sm"
                    data-testid="ingredients-textarea"
                  />
                  <p className="text-xs text-stone-500">Format: quantité unité ingrédient (ex: 200 g farine)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="steps">Étapes de préparation (une par ligne)</Label>
                  <Textarea
                    id="steps"
                    placeholder={"Préchauffer le four à 180°C\nMélanger les ingrédients secs\nAjouter les oeufs un par un\nEnfourner pendant 45 minutes"}
                    value={newRecipe.stepsText}
                    onChange={(e) => setNewRecipe({...newRecipe, stepsText: e.target.value})}
                    className="min-h-[150px] text-sm"
                    data-testid="steps-textarea"
                  />
                </div>
                
                <DialogFooter className="gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="rounded-full"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="rounded-full"
                    data-testid="submit-recipe-btn"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Créer la recette
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter Section */}
        <div className="mb-6 space-y-2" data-testid="filters-section">
          <div className="flex flex-wrap gap-2">
            {row1Filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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

          <div className="flex flex-wrap gap-2 items-center">
            {row2Filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all flex items-center gap-1"
                data-testid="reset-filters"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>

          {row3Filters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {row3Filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => toggleFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
              Commencez par ajouter votre première recette
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/">Importer une recette</Link>
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-full">
                <Plus className="w-4 h-4 mr-2" />
                Créer une recette
              </Button>
            </div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-16" data-testid="no-results">
            <p className="text-stone-600 mb-4">
              Aucune recette ne correspond aux filtres
            </p>
            <Button variant="outline" onClick={resetFilters} className="rounded-full">
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          /* Recipe Grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="recipe-grid">
            {filteredRecipes.map((recipe) => (
              <Card 
                key={recipe.id}
                className="recipe-card group relative bg-white border border-stone-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                data-testid={`recipe-card-${recipe.id}`}
              >
                <div className="h-24 bg-gradient-to-br from-primary/10 to-secondary/30 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ChefHat className="w-8 h-8 text-primary/30" />
                  </div>
                  
                  {/* Source type badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded-full text-xs text-stone-600 flex items-center gap-1">
                    {getSourceIcon(recipe)}
                  </div>
                  
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
