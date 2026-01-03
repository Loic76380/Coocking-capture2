import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowRight, Utensils, Clock, Users, Sparkles, Lock } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleExtract = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour extraire des recettes");
      navigate("/auth");
      return;
    }
    
    if (!url.trim()) {
      toast.error("Veuillez entrer une URL");
      return;
    }
    
    try {
      new URL(url);
    } catch {
      toast.error("URL invalide");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/recipes/extract`, { url }, { timeout: 60000 });
      toast.success("Recette extraite !");
      navigate(`/recipe/${response.data.id}`);
    } catch (error) {
      console.error("Extraction error:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'extraction";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)]" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-12 md:py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Extraction par IA
            </div>
            
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-foreground tracking-tight leading-tight mb-4">
              Capturez vos recettes
              <span className="block text-primary">en un instant</span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-base text-stone-600 leading-relaxed mb-8 max-w-xl mx-auto">
              Collez l'URL d'une recette et notre IA extraira automatiquement 
              les ingrédients, quantités et étapes.
            </p>
            
            {/* URL Input Form */}
            <form onSubmit={handleExtract} className="max-w-xl mx-auto" data-testid="extract-form">
              <div className="relative flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    type="url"
                    placeholder="Collez l'URL de votre recette..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="h-12 pl-12 pr-4 rounded-full border-2 border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base shadow-soft"
                    data-testid="url-input"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all"
                  data-testid="extract-button"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      Extraire
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
              
              {!isAuthenticated && (
                <p className="mt-3 text-sm text-stone-500 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Connexion requise pour extraire des recettes
                </p>
              )}
            </form>
            
            <p className="mt-3 text-xs text-stone-500">
              Compatible avec Marmiton, 750g, etc.
            </p>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-2">
              Comment ça marche ?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            <div className="text-center p-6 rounded-xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-serif font-semibold mb-2">1. Collez l'URL</h3>
              <p className="text-sm text-stone-600">
                Copiez l'adresse de n'importe quelle recette
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-serif font-semibold mb-2">2. Extraction IA</h3>
              <p className="text-sm text-stone-600">
                Notre IA analyse et extrait les données
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-muted/50 hover:bg-muted transition-colors" data-testid="feature-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-serif font-semibold mb-2">3. Organisez</h3>
              <p className="text-sm text-stone-600">
                Classez et partagez vos recettes
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
