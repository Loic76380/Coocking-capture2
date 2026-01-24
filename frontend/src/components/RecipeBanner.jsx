import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChefHat, ExternalLink, Mail, ChevronLeft, ChevronRight, Lock } from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecipeBanner = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef(null);
  const [recipes, setRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [requestForm, setRequestForm] = useState({ name: "", email: "", message: "" });
  const [isSending, setIsSending] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    loadPublicRecipes();
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollButtons);
      return () => scrollElement.removeEventListener('scroll', checkScrollButtons);
    }
  }, [recipes]);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

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
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleRecipeClick = (recipe) => {
    if (!isAuthenticated) {
      setSelectedRecipe(recipe);
      setLoginPromptOpen(true);
      return;
    }

    if (recipe.source_type === "url" && recipe.source_url) {
      window.open(recipe.source_url, "_blank");
    } else {
      setSelectedRecipe(recipe);
      setRequestDialogOpen(true);
    }
  };

  const handleLoginRedirect = () => {
    setLoginPromptOpen(false);
    navigate("/auth");
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
      <div className="w-full bg-gradient-to-r from-primary/5 via-white to-primary/5 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="animate-pulse flex gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-24 h-8 bg-stone-200 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Banner Container */}
      <div className="w-full bg-gradient-to-r from-primary/5 via-white to-primary/5 border-b border-stone-200/50" data-testid="recipe-banner">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center gap-2 py-2">
            {/* Title - Hidden on mobile, visible on tablet+ */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0 pr-3 border-r border-stone-200">
              <ChefHat className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-stone-600 whitespace-nowrap">
                Recettes partagées
              </span>
            </div>

            {/* Mobile Title */}
            <div className="sm:hidden flex items-center gap-1 flex-shrink-0">
              <ChefHat className="w-3 h-3 text-primary" />
            </div>

            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="hidden md:flex w-6 h-6 items-center justify-center rounded-full bg-white shadow-sm border border-stone-200 hover:bg-stone-50 flex-shrink-0"
                aria-label="Défiler à gauche"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600" />
              </button>
            )}

            {/* Scrollable Recipe List */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex gap-2 sm:gap-3">
                {recipes.map((recipe, index) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleRecipeClick(recipe)}
                    className="group flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-white rounded-full border border-stone-200/80 hover:border-primary/50 hover:shadow-sm transition-all flex-shrink-0"
                    data-testid={`banner-recipe-${index}`}
                  >
                    {/* Photo - Hidden on mobile, visible on tablet+ */}
                    <div className="hidden sm:block w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/30 flex-shrink-0">
                      {recipe.image_url ? (
                        <img
                          src={`${BACKEND_URL}${recipe.image_url}`}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="w-3 h-3 text-primary/50" />
                        </div>
                      )}
                    </div>

                    {/* Recipe Info */}
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-xs font-medium text-foreground truncate max-w-[100px] sm:max-w-[120px]">
                        {recipe.title}
                      </span>
                      <span className="text-[10px] text-stone-500 truncate max-w-[100px] sm:max-w-[120px]">
                        par {recipe.user_name}
                      </span>
                    </div>

                    {/* Action Icon */}
                    <div className="hidden sm:flex w-5 h-5 items-center justify-center rounded-full bg-stone-100 group-hover:bg-primary/10 transition-colors flex-shrink-0">
                      {!isAuthenticated ? (
                        <Lock className="w-2.5 h-2.5 text-stone-400 group-hover:text-primary" />
                      ) : recipe.source_type === "url" ? (
                        <ExternalLink className="w-2.5 h-2.5 text-stone-400 group-hover:text-primary" />
                      ) : (
                        <Mail className="w-2.5 h-2.5 text-stone-400 group-hover:text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="hidden md:flex w-6 h-6 items-center justify-center rounded-full bg-white shadow-sm border border-stone-200 hover:bg-stone-50 flex-shrink-0"
                aria-label="Défiler à droite"
              >
                <ChevronRight className="w-4 h-4 text-stone-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Login Prompt Dialog */}
      <Dialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Connexion requise
            </DialogTitle>
            <DialogDescription>
              Connectez-vous pour accéder à la recette "{selectedRecipe?.title}" de {selectedRecipe?.user_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-stone-600">
              En vous connectant, vous pourrez :
            </p>
            <ul className="mt-2 text-sm text-stone-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Voir les recettes partagées par la communauté
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Créer et organiser vos propres recettes
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Partager vos créations culinaires
              </li>
            </ul>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setLoginPromptOpen(false)} className="rounded-full">
              Plus tard
            </Button>
            <Button onClick={handleLoginRedirect} className="rounded-full">
              Se connecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default RecipeBanner;
