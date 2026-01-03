import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  Users,
  Flame,
  ArrowLeft,
  Mail,
  ExternalLink,
  Check,
  ChefHat,
  Send,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`);
      setRecipe(response.data);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      toast.error("Recette non trouvée");
      navigate("/directory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    setIsSending(true);
    
    try {
      await axios.post(`${API}/recipes/${id}/send-email`, {
        recipient_email: email
      });
      toast.success("Recette envoyée avec succès !");
      setEmail("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error sending email:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'envoi";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Chargement de la recette...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8 md:py-12" data-testid="recipe-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            asChild 
            className="text-stone-600 hover:text-foreground"
            data-testid="back-button"
          >
            <Link to="/directory">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux recettes
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-foreground tracking-tight leading-tight mb-4" data-testid="recipe-title">
                {recipe.title}
              </h1>
              
              {recipe.description && (
                <p className="text-lg text-stone-600 leading-relaxed mb-6" data-testid="recipe-description">
                  {recipe.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {recipe.prep_time && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full" data-testid="prep-time">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-stone-700">Préparation: <strong>{recipe.prep_time}</strong></span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full" data-testid="cook-time">
                    <Flame className="w-4 h-4 text-accent" />
                    <span className="text-stone-700">Cuisson: <strong>{recipe.cook_time}</strong></span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full" data-testid="servings">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-stone-700"><strong>{recipe.servings}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Steps */}
            <section className="mb-12" data-testid="steps-section">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-6 flex items-center gap-3">
                <ChefHat className="w-6 h-6 text-primary" />
                Préparation
              </h2>
              
              <div className="space-y-6">
                {recipe.steps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex gap-4 p-4 bg-white rounded-xl border border-stone-100 hover:border-stone-200 transition-colors"
                    data-testid={`step-${step.step_number}`}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="step-number text-lg text-primary">{step.step_number}</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed pt-2">
                      {step.instruction}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Source */}
            <div className="flex items-center justify-between py-6 border-t border-stone-100">
              <span className="text-sm text-stone-500">Source originale</span>
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                data-testid="source-url"
              >
                Voir la page
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Ingredients Card */}
              <Card className="p-6 rounded-2xl border-stone-100 shadow-soft" data-testid="ingredients-section">
                <h2 className="text-xl font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                  Ingrédients
                  <span className="text-sm font-sans font-normal text-stone-500">
                    ({recipe.ingredients.length})
                  </span>
                </h2>
                
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing, index) => (
                    <li 
                      key={index}
                      className="ingredient-row flex items-center gap-3 p-3 rounded-lg"
                      data-testid={`ingredient-${index}`}
                    >
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-stone-700">
                        <span className="font-mono text-sm text-primary font-medium">
                          {ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}
                        </span>
                        {' '}
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Email CTA Card */}
              <Card className="p-6 rounded-2xl border-primary/20 bg-primary/5" data-testid="email-cta">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Envoyer par email</h3>
                    <p className="text-sm text-stone-600">Partagez cette recette</p>
                  </div>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full rounded-full bg-primary hover:bg-primary/90"
                      data-testid="open-email-dialog"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer la recette
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-2xl">Envoyer la recette</DialogTitle>
                      <DialogDescription>
                        Entrez l'adresse email du destinataire. La recette sera envoyée dans un format élégant.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
                      <div>
                        <label htmlFor="email" className="text-sm font-medium text-foreground mb-2 block">
                          Adresse email
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="exemple@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12"
                          data-testid="email-input"
                          disabled={isSending}
                        />
                      </div>
                      
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="rounded-full"
                        >
                          Annuler
                        </Button>
                        <Button 
                          type="submit"
                          disabled={isSending}
                          className="rounded-full bg-primary hover:bg-primary/90"
                          data-testid="send-email-button"
                        >
                          {isSending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Envoi...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Envoyer
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
