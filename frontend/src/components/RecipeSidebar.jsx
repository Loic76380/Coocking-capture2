import { useState, useEffect } from "react";
import axios from "axios";
import { ChefHat, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecipeSidebar = () => {
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [requestForm, setRequestForm] = useState({ name: "", email: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadPublicRecipes();
  }, []);

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

  const handleRecipeClick = (recipe) => {
    if (recipe.source_type === "url" && recipe.source_url) {
      // Open original source
      window.open(recipe.source_url, "_blank");
    } else {
      // Open request dialog
      setSelectedRecipe(recipe);
      setRequestDialogOpen(true);
    }
  };

  const handleRequestRecipe = async (e) => {
    e.preventDefault();
    if (!requestForm.name || !requestForm.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setIsSending(true);
    try {
      await axios.post(`${API}/contact`, {
        name: requestForm.name,
        email: requestForm.email,
        subject: `Demande de recette : ${selectedRecipe?.title}`,
        message: `Bonjour,\n\nJe souhaiterais recevoir la recette "${selectedRecipe?.title}" créée par ${selectedRecipe?.user_name}.\n\n${requestForm.message || ''}\n\nMerci !`
      });
      toast.success("Demande envoyée !");
      setRequestDialogOpen(false);
      setRequestForm({ name: "", email: "", message: "" });
    } catch (error) {
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-64 bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-stone-200/50">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-200 rounded w-3/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-stone-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full lg:w-64 bg-white/80 backdrop-blur-sm rounded-xl border border-stone-200/50 overflow-hidden shadow-soft" data-testid="recipe-sidebar">
        <div className="p-3 bg-primary/5 border-b border-stone-100">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-primary" />
            Dernières recettes partagées
          </h3>
        </div>
        
        {/* Horizontal scroll on mobile, vertical on desktop */}
        <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto lg:max-h-[400px] gap-2 lg:gap-0 p-2 lg:p-0">
          {recipes.map((recipe, index) => (
            <button
              key={recipe.id}
              onClick={() => handleRecipeClick(recipe)}
              className="flex-shrink-0 w-48 lg:w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors lg:border-b border-stone-100/50 last:border-b-0 text-left rounded-lg lg:rounded-none bg-white lg:bg-transparent"
              data-testid={`sidebar-recipe-${index}`}
            >
              {/* Image or placeholder */}
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/10 to-secondary/20">
                {recipe.image_url ? (
                  <img
                    src={`${BACKEND_URL}${recipe.image_url}`}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-primary/40" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {recipe.title}
                </p>
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  {recipe.source_type === "url" ? (
                    <>
                      <ExternalLink className="w-3 h-3" />
                      <span>Voir le site</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3 h-3" />
                      <span>Demander</span>
                    </>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Request Recipe Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Demander cette recette</DialogTitle>
            <DialogDescription>
              Envoyez une demande à <strong>{selectedRecipe?.user_name}</strong> pour recevoir la recette "{selectedRecipe?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleRequestRecipe} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="req-name">Votre nom</Label>
              <Input
                id="req-name"
                placeholder="Votre nom"
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="req-email">Votre email</Label>
              <Input
                id="req-email"
                type="email"
                placeholder="votre@email.com"
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="req-message">Message (optionnel)</Label>
              <Textarea
                id="req-message"
                placeholder="Un petit mot..."
                value={requestForm.message}
                onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? "Envoi..." : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecipeSidebar;
