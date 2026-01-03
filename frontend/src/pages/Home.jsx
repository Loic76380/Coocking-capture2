import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Utensils, Clock, Users, Sparkles } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleExtract = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Veuillez entrer une URL");
      return;
    }
    
    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error("URL invalide. Veuillez entrer une URL valide.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/recipes/extract`, { url });
      toast.success("Recette extraite avec succès !");
      navigate(`/recipe/${response.data.id}`);
    } catch (error) {
      console.error("Extraction error:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'extraction de la recette";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)]" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-16 md:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/30 text-primary text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Extraction intelligente par IA
            </div>
            
            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-semibold text-foreground tracking-tight leading-tight mb-6">
              Capturez vos recettes
              <span className="block text-primary">en un instant</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-stone-600 leading-relaxed mb-10 max-w-2xl mx-auto">
              Collez simplement l'URL d'une recette et notre IA extraira automatiquement 
              les ingrédients, quantités et étapes de préparation.
            </p>
            
            {/* URL Input Form */}
            <form onSubmit={handleExtract} className="max-w-2xl mx-auto" data-testid="extract-form">
              <div className="relative flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    type="url"
                    placeholder="Collez l'URL de votre recette..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-14 pl-14 pr-4 rounded-full border-2 border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base shadow-soft url-input"
                    data-testid="url-input"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all btn-primary"
                  data-testid="extract-button"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Extraction...
                    </>
                  ) : (
                    <>
                      Extraire
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
            
            {/* Example URLs */}
            <p className="mt-4 text-sm text-stone-500">
              Fonctionne avec la plupart des sites de recettes (Marmiton, 750g, etc.)
            </p>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-stone-600 max-w-xl mx-auto">
              Trois étapes simples pour capturer et partager vos recettes préférées
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {/* Feature 1 */}
            <div className="text-center p-8 rounded-2xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">1. Collez l'URL</h3>
              <p className="text-stone-600">
                Copiez l'adresse web de n'importe quelle page de recette
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="text-center p-8 rounded-2xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Utensils className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">2. Extraction IA</h3>
              <p className="text-stone-600">
                Notre IA analyse et extrait les ingrédients et étapes
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="text-center p-8 rounded-2xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <ArrowRight className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-serif font-semibold mb-3">3. Sauvegardez & Partagez</h3>
              <p className="text-stone-600">
                Retrouvez vos recettes et envoyez-les par email
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Section */}
      <section className="py-12 border-t border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div data-testid="stat-1">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-2xl font-serif font-semibold text-foreground">30s</p>
              <p className="text-sm text-stone-500">Temps d'extraction</p>
            </div>
            <div data-testid="stat-2">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Utensils className="w-5 h-5" />
              </div>
              <p className="text-2xl font-serif font-semibold text-foreground">100%</p>
              <p className="text-sm text-stone-500">Compatible</p>
            </div>
            <div data-testid="stat-3">
              <div className="flex items-center justify-center gap-2 text-primary mb-2">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-2xl font-serif font-semibold text-foreground">Gratuit</p>
              <p className="text-sm text-stone-500">Sans inscription</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
