import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  ImageIcon,
  Share2,
  Copy,
  Smartphone,
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
  
  // Edit states
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [editingStep, setEditingStep] = useState(null);
  const [editedIngredients, setEditedIngredients] = useState([]);
  const [editedSteps, setEditedSteps] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image upload states
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  const allFilters = getAllFilters();

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const response = await axios.get(`${API}/recipes/${id}`);
      setRecipe(response.data);
      setSelectedTags(response.data.tags || []);
      setEditedIngredients(response.data.ingredients || []);
      setEditedSteps(response.data.steps || []);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      toast.error("Recette non trouvée");
      navigate("/directory");
    } finally {
      setIsLoading(false);
    }
  };

  // Format recipe for sharing
  const formatRecipeForEmail = () => {
    if (!recipe) return { subject: "", body: "" };
    
    const subject = `Recette : ${recipe.title}`;
    
    let body = `🍳 ${recipe.title}\n\n`;
    
    if (recipe.description) {
      body += `${recipe.description}\n\n`;
    }
    
    // Meta info
    const meta = [];
    if (recipe.prep_time) meta.push(`⏱️ Préparation : ${recipe.prep_time}`);
    if (recipe.cook_time) meta.push(`🔥 Cuisson : ${recipe.cook_time}`);
    if (recipe.servings) meta.push(`👥 Portions : ${recipe.servings}`);
    if (meta.length > 0) body += meta.join(" | ") + "\n\n";
    
    // Ingredients
    body += "📝 INGRÉDIENTS\n";
    body += "─────────────\n";
    recipe.ingredients?.forEach(ing => {
      body += `• ${ing.quantity || ""} ${ing.unit || ""} ${ing.name}\n`;
    });
    body += "\n";
    
    // Steps
    body += "👨‍🍳 PRÉPARATION\n";
    body += "─────────────\n";
    recipe.steps?.forEach((step, i) => {
      body += `${i + 1}. ${step.instruction}\n\n`;
    });
    
    // Promo link
    body += "─────────────────────────────\n";
    body += "🍳 Recette partagée via Cooking Capture\n";
    body += "Découvrez l'application : https://coocking-capture.fr\n";
    
    return { subject, body };
  };

  const handleShareEmail = () => {
    const { subject, body } = formatRecipeForEmail();
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
    toast.success("Ouverture de votre application email...");
    setIsDialogOpen(false);
  };

  const handleShareNative = async () => {
    if (!navigator.share) {
      handleShareEmail();
      return;
    }
    
    const { subject, body } = formatRecipeForEmail();
    
    try {
      await navigator.share({
        title: subject,
        text: body,
      });
      toast.success("Recette partagée !");
      setIsDialogOpen(false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Fallback to mailto
        handleShareEmail();
      }
    }
  };

  const handleCopyToClipboard = async () => {
    const { body } = formatRecipeForEmail();
    try {
      await navigator.clipboard.writeText(body);
      toast.success("Recette copiée dans le presse-papier !");
    } catch (error) {
      toast.error("Impossible de copier");
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
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

  // Ingredient editing
  const updateIngredient = (index, field, value) => {
    const updated = [...editedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setEditedIngredients(updated);
  };

  const saveIngredient = async (index) => {
    setIsSaving(true);
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: editedIngredients });
      setRecipe({ ...recipe, ingredients: editedIngredients });
      setEditingIngredient(null);
      toast.success("Ingrédient modifié !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteIngredient = async (index) => {
    const updated = editedIngredients.filter((_, i) => i !== index);
    setEditedIngredients(updated);
    setIsSaving(true);
    try {
      await axios.put(`${API}/recipes/${id}`, { ingredients: updated });
      setRecipe({ ...recipe, ingredients: updated });
      toast.success("Ingrédient supprimé !");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      setEditedIngredients(recipe.ingredients);
    } finally {
      setIsSaving(false);
    }
  };

  const addIngredient = async () => {
    const newIngredient = { name: "Nouvel ingrédient", quantity: "1", unit: "" };
    const updated = [...editedIngredients, newIngredient];
    setEditedIngredients(updated);
    setEditingIngredient(updated.length - 1);
  };

  // Step editing
  const updateStep = (index, value) => {
    const updated = [...editedSteps];
    updated[index] = { ...updated[index], instruction: value };
    setEditedSteps(updated);
  };

  const saveStep = async (index) => {
    setIsSaving(true);
    try {
      await axios.put(`${API}/recipes/${id}`, { steps: editedSteps });
      setRecipe({ ...recipe, steps: editedSteps });
      setEditingStep(null);
      toast.success("Étape modifiée !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStep = async (index) => {
    const updated = editedSteps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      step_number: i + 1
    }));
    setEditedSteps(updated);
    setIsSaving(true);
    try {
      await axios.put(`${API}/recipes/${id}`, { steps: updated });
      setRecipe({ ...recipe, steps: updated });
      toast.success("Étape supprimée !");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      setEditedSteps(recipe.steps);
    } finally {
      setIsSaving(false);
    }
  };

  const addStep = async () => {
    const newStep = { step_number: editedSteps.length + 1, instruction: "Nouvelle étape" };
    const updated = [...editedSteps, newStep];
    setEditedSteps(updated);
    setEditingStep(updated.length - 1);
  };

  const cancelIngredientEdit = () => {
    setEditedIngredients(recipe.ingredients);
    setEditingIngredient(null);
  };

  const cancelStepEdit = () => {
    setEditedSteps(recipe.steps);
    setEditingStep(null);
  };

  const getFilterById = (filterId) => allFilters.find(f => f.id === filterId);

  // Image upload handlers
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Format non supporté. Utilisez JPG, PNG ou WebP.");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10MB)");
      return;
    }

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/recipes/${id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRecipe({ ...recipe, image_url: response.data.image_url });
      toast.success("Image téléchargée !");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors du téléchargement";
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeleteImage = async () => {
    setIsDeletingImage(true);
    try {
      await axios.delete(`${API}/recipes/${id}/image`);
      setRecipe({ ...recipe, image_url: null });
      toast.success("Image supprimée !");
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la suppression";
      toast.error(message);
    } finally {
      setIsDeletingImage(false);
    }
  };

  const row1Filters = allFilters.filter(f => f.row === 1);
  const row2Filters = allFilters.filter(f => f.row === 2);
  const row3Filters = allFilters.filter(f => f.row === 3);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" data-testid="loading-state">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-600">Chargement...</p>
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
          <Button variant="ghost" asChild className="text-stone-600 hover:text-foreground" data-testid="back-button">
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
                <p className="text-base text-stone-600 leading-relaxed mb-4">{recipe.description}</p>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {recipe.prep_time && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="text-stone-700">Prépa: <strong>{recipe.prep_time}</strong></span>
                  </div>
                )}
                {recipe.cook_time && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                    <Flame className="w-3.5 h-3.5 text-accent" />
                    <span className="text-stone-700">Cuisson: <strong>{recipe.cook_time}</strong></span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span className="text-stone-700"><strong>{recipe.servings}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Recipe Image Section */}
            <Card className="p-4 mb-6 border-stone-100" data-testid="image-section">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Photo de la recette</h3>
              </div>
              
              {recipe.image_url ? (
                <div className="relative group">
                  <img 
                    src={`${BACKEND_URL}${recipe.image_url}`}
                    alt={recipe.title}
                    className="w-full h-48 object-cover rounded-lg"
                    data-testid="recipe-detail-image"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage}
                        data-testid="change-image-input"
                      />
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-full pointer-events-none"
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage ? (
                          <>
                            <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-700 rounded-full animate-spin mr-2" />
                            Chargement...
                          </>
                        ) : (
                          <>
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </>
                        )}
                      </Button>
                    </label>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="rounded-full"
                      onClick={handleDeleteImage}
                      disabled={isDeletingImage}
                      data-testid="delete-image-btn"
                    >
                      {isDeletingImage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Suppression...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                    data-testid="upload-image-input"
                  />
                  <div className="border-2 border-dashed border-stone-200 rounded-lg p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
                        <p className="text-sm text-stone-600">Téléchargement en cours...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                        <p className="text-sm text-stone-600 mb-1">Cliquez pour ajouter une photo</p>
                        <p className="text-xs text-stone-400">JPG, PNG ou WebP (max 10MB)</p>
                      </>
                    )}
                  </div>
                </label>
              )}
            </Card>

            {/* Tags/Categories Section */}
            <Card className="p-4 mb-6 border-stone-100" data-testid="tags-section">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Catégories</h3>
              </div>
              
              <div className="space-y-2">
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
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
                
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
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
                
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
                      >
                        {filter.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {tagsChanged && (
                <Button onClick={saveTags} disabled={isSavingTags} size="sm" className="mt-3 rounded-full">
                  {isSavingTags ? "Sauvegarde..." : "Enregistrer les catégories"}
                </Button>
              )}
            </Card>

            {/* Steps Section - Editable */}
            <section className="mb-8" data-testid="steps-section">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" />
                  Préparation
                </h2>
                <Button variant="outline" size="sm" onClick={addStep} className="rounded-full" data-testid="add-step-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
              
              <div className="space-y-3">
                {editedSteps.map((step, index) => (
                  <div 
                    key={index}
                    className="group flex gap-3 p-3 bg-white rounded-lg border border-stone-100 hover:border-stone-200 transition-colors"
                    data-testid={`step-${step.step_number}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm text-primary font-semibold">{step.step_number}</span>
                    </div>
                    
                    {editingStep === index ? (
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={step.instruction}
                          onChange={(e) => updateStep(index, e.target.value)}
                          className="min-h-[80px] text-sm"
                          data-testid={`edit-step-input-${index}`}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveStep(index)} disabled={isSaving} className="rounded-full">
                            <Save className="w-3 h-3 mr-1" />
                            Enregistrer
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelStepEdit} className="rounded-full">
                            <X className="w-3 h-3 mr-1" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-start justify-between">
                        <p className="text-stone-700 leading-relaxed text-sm pt-1">{step.instruction}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-7 h-7"
                            onClick={() => setEditingStep(index)}
                            data-testid={`edit-step-btn-${index}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-7 h-7 text-destructive hover:text-destructive"
                            onClick={() => deleteStep(index)}
                            data-testid={`delete-step-btn-${index}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Source */}
            <div className="flex items-center justify-between py-4 border-t border-stone-100 text-sm">
              <span className="text-stone-500">Source</span>
              <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                Voir l'original
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 space-y-4">
              {/* Ingredients Card - Editable */}
              <Card className="p-4 rounded-xl border-stone-100 shadow-soft" data-testid="ingredients-section">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-serif font-semibold text-foreground flex items-center gap-2">
                    Ingrédients
                    <span className="text-sm font-sans font-normal text-stone-500">
                      ({editedIngredients.length})
                    </span>
                  </h2>
                  <Button variant="outline" size="sm" onClick={addIngredient} className="rounded-full h-7 px-2" data-testid="add-ingredient-btn">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                
                <ul className="space-y-1">
                  {editedIngredients.map((ing, index) => (
                    <li 
                      key={index}
                      className="group ingredient-row rounded-lg"
                      data-testid={`ingredient-${index}`}
                    >
                      {editingIngredient === index ? (
                        <div className="p-2 space-y-2 bg-muted rounded-lg">
                          <div className="flex gap-2">
                            <Input
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                              placeholder="Qté"
                              className="w-16 h-8 text-xs"
                              data-testid={`edit-qty-${index}`}
                            />
                            <Input
                              value={ing.unit || ''}
                              onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                              placeholder="Unité"
                              className="w-16 h-8 text-xs"
                              data-testid={`edit-unit-${index}`}
                            />
                            <Input
                              value={ing.name}
                              onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                              placeholder="Ingrédient"
                              className="flex-1 h-8 text-xs"
                              data-testid={`edit-name-${index}`}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => saveIngredient(index)} disabled={isSaving} className="rounded-full h-7 text-xs">
                              <Save className="w-3 h-3 mr-1" />
                              OK
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelIngredientEdit} className="rounded-full h-7 text-xs">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-stone-700">
                              <span className="font-mono text-xs text-primary font-medium">
                                {ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}
                              </span>
                              {' '}{ing.name}
                            </span>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6"
                              onClick={() => setEditingIngredient(index)}
                              data-testid={`edit-ingredient-btn-${index}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6 text-destructive hover:text-destructive"
                              onClick={() => deleteIngredient(index)}
                              data-testid={`delete-ingredient-btn-${index}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Share CTA Card */}
              <Card className="p-4 rounded-xl border-primary/20 bg-primary/5" data-testid="share-cta">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm">Partager la recette</h3>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full rounded-full bg-primary hover:bg-primary/90 h-9 text-sm" data-testid="open-share-dialog">
                      <Send className="w-3.5 h-3.5 mr-2" />
                      Partager
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl">Partager la recette</DialogTitle>
                      <DialogDescription>Choisissez comment partager "{recipe?.title}"</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 mt-4">
                      {/* Native Share (mobile) */}
                      {typeof navigator !== 'undefined' && navigator.share && (
                        <Button 
                          onClick={handleShareNative} 
                          className="w-full rounded-full h-11 justify-start"
                          data-testid="share-native-btn"
                        >
                          <Smartphone className="w-4 h-4 mr-3" />
                          Partager via une application
                        </Button>
                      )}
                      
                      {/* Email */}
                      <Button 
                        onClick={handleShareEmail} 
                        variant="outline"
                        className="w-full rounded-full h-11 justify-start"
                        data-testid="share-email-btn"
                      >
                        <Mail className="w-4 h-4 mr-3" />
                        Envoyer par email
                      </Button>
                      
                      {/* Copy */}
                      <Button 
                        onClick={handleCopyToClipboard} 
                        variant="outline"
                        className="w-full rounded-full h-11 justify-start"
                        data-testid="copy-recipe-btn"
                      >
                        <Copy className="w-4 h-4 mr-3" />
                        Copier dans le presse-papier
                      </Button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-stone-500 text-center">
                        🍳 Un lien vers Cooking Capture sera inclus dans le partage
                      </p>
                    </div>
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
