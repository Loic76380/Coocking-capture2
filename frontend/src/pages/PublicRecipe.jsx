import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Clock,
  Users,
  ChefHat,
  ArrowLeft,
  Plus,
  ExternalLink,
  Lock,
  Check,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/public/${id}`);
      setRecipe(response.data);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      const message = error.response?.data?.detail || "Recette non trouvée";
      toast.error(message);
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToAccount = async () => {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour ajouter cette recette à votre collection");
      navigate("/auth");
      return;
    }

    setIsCopying(true);
    try {
      await axios.post(`${API}/recipes/copy/${id}`);
      toast.success("Recette ajoutée à votre collection !");
      setCopied(true);
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la copie";
      toast.error(message);
    } finally {
      setIsCopying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-white" data-testid="public-recipe-page">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Button>
          
          {copied ? (
            <Button disabled className="gap-2 bg-green-600">
              <Check className="w-4 h-4" />
              Ajoutée !
            </Button>
          ) : (
            <Button
              onClick={handleCopyToAccount}
              disabled={isCopying}
              className="gap-2"
              data-testid="copy-recipe-btn"
            >
              {isCopying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ajout en cours...
                </>
              ) : isAuthenticated ? (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter à ma collection
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Se connecter pour ajouter
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Recipe Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <ChefHat className="w-4 h-4" />
            Recette partagée par {recipe.user_name}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {recipe.title}
          </h1>
          
          {recipe.description && (
            <p className="text-stone-600 max-w-2xl mx-auto">
              {recipe.description}
            </p>
          )}
          
          {recipe.source_url && (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
            >
              <ExternalLink className="w-3 h-3" />
              Voir la source originale
            </a>
          )}
        </div>

        {/* Image */}
        {recipe.image_url && (
          <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
            <img
              src={`${BACKEND_URL}${recipe.image_url}`}
              alt={recipe.title}
              className="w-full h-64 md:h-96 object-cover"
            />
          </div>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {recipe.prep_time && (
            <div className="flex items-center gap-2 text-stone-600">
              <Clock className="w-5 h-5 text-primary" />
              <span>Préparation : {recipe.prep_time}</span>
            </div>
          )}
          {recipe.cook_time && (
            <div className="flex items-center gap-2 text-stone-600">
              <Clock className="w-5 h-5 text-primary" />
              <span>Cuisson : {recipe.cook_time}</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-2 text-stone-600">
              <Users className="w-5 h-5 text-primary" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Ingredients */}
          <Card className="p-6 md:col-span-1">
            <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                🥕
              </span>
              Ingrédients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, index) => (
                <li key={index} className="flex items-start gap-2 text-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <span>
                    {ing.quantity && <strong>{ing.quantity}</strong>}
                    {ing.unit && ` ${ing.unit}`}
                    {(ing.quantity || ing.unit) && " "}{ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Steps */}
          <Card className="p-6 md:col-span-2">
            <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                📝
              </span>
              Préparation
            </h2>
            <ol className="space-y-4">
              {recipe.steps?.map((step, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                    {step.step_number || index + 1}
                  </span>
                  <p className="text-stone-700 pt-1">{step.instruction}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Card className="inline-block p-6 bg-primary/5 border-primary/20">
            <p className="text-stone-600 mb-4">
              Envie de garder cette recette ? Ajoutez-la à votre collection !
            </p>
            {copied ? (
              <Button disabled className="gap-2 bg-green-600">
                <Check className="w-4 h-4" />
                Recette ajoutée à votre collection
              </Button>
            ) : (
              <Button
                onClick={handleCopyToAccount}
                disabled={isCopying}
                size="lg"
                className="gap-2"
              >
                {isAuthenticated ? (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter à ma collection
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Se connecter pour ajouter
                  </>
                )}
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PublicRecipe;
