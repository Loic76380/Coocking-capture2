import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
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
  Tag,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAllFilters } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  const allFilters = getAllFilters();

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`);
      setRecipe(response.data);
      setSelectedTags(response.data.tags || []);
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

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const saveTags = async () => {
    setIsSavingTags(true);
    try {
      await axios.put(`${API}/recipes/${id}`, { tags: selectedTags });
      setRecipe({ ...recipe, tags: selectedTags });
      toast.success("Catégories mises à jour !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSavingTags(false);
    }
  };

  const getFilterById = (filterId) => {
    return allFilters.find(f => f.id === filterId);
  };

  // Group filters by row
  const row1Filters = allFilters.filter(f => f.row === 1);
  const row2Filters = allFilters.filter(f => f.row === 2);
  const row3Filters = allFilters.filter(f => f.row === 3);

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

  if (!recipe) return null;

  const tagsChanged = JSON.stringify(selectedTags.sort()) !== JSON.stringify((recipe.tags || []).sort());

  return (
    <div className="min-h-[calc(100vh-64px)] py-8" data-testid="recipe-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            asChild 
            className="text-stone-600 hover:text-foreground"
            data-testid="back-button"
          >
            <Link to="/directory">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 animate-fade-in">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-foreground tracking-tight leading-tight mb-3" data-testid="recipe-title">
                {recipe.title}
              </h1>
              
              {recipe.description && (
                <p className="text-base text-stone-600 leading-relaxed mb-4" data-testid="recipe-description">
                  {recipe.description}
                </p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {recipe.prep_time && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full" data-testid="prep-time">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-stone-700">Prépa: <strong>{recipe.prep_time}</strong></span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full" data-testid="cook-time">
                    <Flame className="w-3.5 h-3.5 text-accent" />
                    <span className="text-stone-700">Cuisson: <strong>{recipe.cook_time}</strong></span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full" data-testid="servings">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-stone-700"><strong>{recipe.servings}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags/Categories Section */}
            <Card className="p-4 mb-6 border-stone-100" data-testid="tags-section">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Catégories</h3>
              </div>
              
              <div className="space-y-2">
                {/* Row 1 */}
                <div className="flex flex-wrap gap-2">
                  {row1Filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => toggleTag(filter.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(filter.id)
                          ? 'text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      style={selectedTags.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                      data-testid={`tag-${filter.id}`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
                
                {/* Row 2 */}
                <div className="flex flex-wrap gap-2">
                  {row2Filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => toggleTag(filter.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedTags.includes(filter.id)
                          ? 'text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                      style={selectedTags.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                      data-testid={`tag-${filter.id}`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
                
                {/* Row 3: Custom */}
                {row3Filters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {row3Filters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => toggleTag(filter.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          selectedTags.includes(filter.id)
                            ? 'text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                        style={selectedTags.includes(filter.id) ? { backgroundColor: filter.color } : {}}
                        data-testid={`tag-${filter.id}`}
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {tagsChanged && (
                <Button
                  onClick={saveTags}
                  disabled={isSavingTags}
                  size="sm"
                  className="mt-3 rounded-full"
                  data-testid="save-tags-btn"
                >
                  {isSavingTags ? "Sauvegarde..." : "Enregistrer les catégories"}
                </Button>
              )}
            </Card>

            {/* Steps */}
            <section className="mb-8" data-testid="steps-section">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                Préparation
              </h2>
              
              <div className="space-y-4">
                {recipe.steps.map((step, index) => (
                  <div 
                    key={index}
                    className="flex gap-3 p-3 bg-white rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
                    data-testid={`step-${step.step_number}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="step-number text-sm text-primary font-semibold">{step.step_number}</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed text-sm pt-1">
                      {step.instruction}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Source */}
            <div className="flex items-center justify-between py-4 border-t border-stone-100 text-sm">
              <span className="text-stone-500">Source</span>
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
                data-testid="source-url"
              >
                Voir l'original
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              {/* Ingredients Card */}
              <Card className="p-4 rounded-xl border-stone-100 shadow-soft" data-testid="ingredients-section">
                <h2 className="text-lg font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
                  Ingrédients
                  <span className="text-sm font-sans font-normal text-stone-500">
                    ({recipe.ingredients.length})
                  </span>
                </h2>
                
                <ul className="space-y-1.5">
                  {recipe.ingredients.map((ing, index) => (
                    <li 
                      key={index}
                      className="ingredient-row flex items-center gap-2 p-2 rounded-lg text-sm"
                      data-testid={`ingredient-${index}`}
                    >
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-stone-700">
                        <span className="font-mono text-xs text-primary font-medium">
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
              <Card className="p-4 rounded-xl border-primary/20 bg-primary/5" data-testid="email-cta">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground text-sm">Envoyer par email</h3>
                  </div>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full rounded-full bg-primary hover:bg-primary/90 h-9 text-sm"
                      data-testid="open-email-dialog"
                    >
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Envoyer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl">Envoyer la recette</DialogTitle>
                      <DialogDescription>
                        La recette sera envoyée dans un format élégant.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSendEmail} className="space-y-4 mt-4">
                      <div>
                        <Input
                          type="email"
                          placeholder="email@exemple.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-11"
                          data-testid="email-input"
                          disabled={isSending}
                        />
                      </div>
                      
                      <DialogFooter className="gap-2">
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
                          {isSending ? "Envoi..." : "Envoyer"}
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
