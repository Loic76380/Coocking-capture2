import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, ArrowRight, Utensils, Clock, Users, Sparkles, Lock, Upload, FileText, Image, File } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Home = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const extractUrl = (text) => {
    // Extract URL from text that may contain characters before http/https
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    return urlMatch ? urlMatch[1] : text;
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    // Auto-extract URL if text contains http:// or https://
    if (value.includes('http://') || value.includes('https://')) {
      setUrl(extractUrl(value));
    } else {
      setUrl(value);
    }
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour extraire des recettes");
      navigate("/auth");
      return;
    }
    
    // Clean URL before validation
    const cleanUrl = extractUrl(url.trim());
    
    if (!cleanUrl) {
      toast.error("Veuillez entrer une URL");
      return;
    }
    
    try {
      new URL(cleanUrl);
    } catch {
      toast.error("URL invalide");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/recipes/extract`, { url: cleanUrl }, { timeout: 60000 });
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

  const handleFileUpload = async (file) => {
    if (!isAuthenticated) {
      toast.error("Connectez-vous pour importer des recettes");
      navigate("/auth");
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?|txt|jpe?g|png|webp)$/i)) {
      toast.error("Type de fichier non supporté. Utilisez PDF, Word, TXT ou image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10MB)");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/recipes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });

      toast.success("Recette importée !");
      navigate(`/recipe/${response.data.id}`);
    } catch (error) {
      console.error("Upload error:", error);
      const message = error.response?.data?.detail || "Erreur lors de l'import";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const getFileIcon = (isDragging) => {
    if (isDragging) return <Upload className="w-8 h-8 text-primary animate-bounce" />;
    return <FileText className="w-8 h-8 text-primary" />;
  };

  return (
    <div className="min-h-[calc(100vh-56px)]" data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-10 md:py-16 lg:py-20">
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
              Collez une URL ou importez un document et notre IA extraira 
              automatiquement les ingrédients et étapes.
            </p>
            
            {/* URL Input Form */}
            <form onSubmit={handleExtract} className="max-w-xl mx-auto mb-6" data-testid="extract-form">
              <div className="relative flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    type="text"
                    placeholder="Collez l'URL de votre recette..."
                    value={url}
                    onChange={handleUrlChange}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pastedText = e.clipboardData.getData('text');
                      const extracted = extractUrl(pastedText);
                      setUrl(extracted);
                    }}
                    className="h-12 pl-12 pr-4 rounded-full border-2 border-stone-200 focus:border-primary focus:ring-4 focus:ring-primary/10 text-base shadow-soft"
                    data-testid="url-input"
                    disabled={isLoading || isUploading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || isUploading}
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
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-xl mx-auto mb-6">
              <div className="flex-1 h-px bg-stone-200" />
              <span className="text-sm text-stone-500">ou</span>
              <div className="flex-1 h-px bg-stone-200" />
            </div>

            {/* File Upload Zone */}
            <div
              className={`max-w-xl mx-auto p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                dragActive 
                  ? 'border-primary bg-primary/5 scale-[1.02]' 
                  : 'border-stone-300 hover:border-primary/50 hover:bg-stone-50'
              } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              data-testid="file-upload-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.webp"
                onChange={handleFileInput}
                data-testid="file-input"
              />
              
              <div className="flex flex-col items-center gap-3">
                {isUploading ? (
                  <>
                    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium text-primary">Analyse du document...</p>
                  </>
                ) : (
                  <>
                    {getFileIcon(dragActive)}
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {dragActive ? "Déposez le fichier ici" : "Glissez un document ou cliquez"}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        PDF, Word, TXT ou image (max 10MB)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-stone-100 rounded text-xs text-stone-600 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> PDF
                      </span>
                      <span className="px-2 py-1 bg-stone-100 rounded text-xs text-stone-600 flex items-center gap-1">
                        <File className="w-3 h-3" /> Word
                      </span>
                      <span className="px-2 py-1 bg-stone-100 rounded text-xs text-stone-600 flex items-center gap-1">
                        <Image className="w-3 h-3" /> Image
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {!isAuthenticated && (
              <p className="mt-4 text-sm text-stone-500 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Connexion requise pour extraire des recettes
              </p>
            )}
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
              <h3 className="text-lg font-serif font-semibold mb-2">1. URL ou Document</h3>
              <p className="text-sm text-stone-600">
                Collez une URL ou importez PDF, Word, image
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
