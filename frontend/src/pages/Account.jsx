import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Tag, Plus, Trash2, Palette } from "lucide-react";

const PRESET_COLORS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", 
  "#8B5CF6", "#EC4899", "#06B6D4", "#6B7280"
];

const Account = () => {
  const { user, updateUser, filters, addCustomFilter, deleteCustomFilter } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterColor, setNewFilterColor] = useState("#6B7280");
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      await updateUser({ name });
      toast.success("Profil mis à jour !");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddFilter = async (e) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    
    setIsAddingFilter(true);
    
    try {
      await addCustomFilter(newFilterName.trim(), newFilterColor);
      setNewFilterName("");
      setNewFilterColor("#6B7280");
      toast.success("Filtre créé !");
    } catch (error) {
      toast.error("Erreur lors de la création du filtre");
    } finally {
      setIsAddingFilter(false);
    }
  };

  const handleDeleteFilter = async (filterId, filterName) => {
    try {
      await deleteCustomFilter(filterId);
      toast.success(`Filtre "${filterName}" supprimé`);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-12" data-testid="account-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-semibold text-foreground">Mon Compte</h1>
          <p className="text-stone-600 mt-2">Gérez votre profil et vos filtres personnalisés</p>
        </div>

        {/* Profile Section */}
        <Card className="mb-8 border-stone-200 shadow-soft" data-testid="profile-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profil
            </CardTitle>
            <CardDescription>Vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="profile-name"
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isUpdating}
                className="rounded-full"
                data-testid="update-profile-btn"
              >
                {isUpdating ? "Mise à jour..." : "Enregistrer"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="border-stone-200 shadow-soft" data-testid="filters-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Mes Filtres Personnalisés
            </CardTitle>
            <CardDescription>
              Créez vos propres catégories pour organiser vos recettes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Add New Filter Form */}
            <form onSubmit={handleAddFilter} className="mb-6" data-testid="add-filter-form">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="filter-name">Nouveau filtre</Label>
                  <Input
                    id="filter-name"
                    type="text"
                    placeholder="Ex: Végétarien, Rapide..."
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    data-testid="new-filter-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewFilterColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          newFilterColor === color ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`color-${color}`}
                      />
                    ))}
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  disabled={isAddingFilter || !newFilterName.trim()}
                  className="rounded-full"
                  data-testid="add-filter-btn"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </form>

            <Separator className="my-6" />

            {/* Existing Custom Filters */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
                Vos filtres ({filters.custom_filters?.length || 0})
              </h4>
              
              {filters.custom_filters?.length === 0 ? (
                <p className="text-stone-500 text-sm py-4">
                  Vous n'avez pas encore créé de filtres personnalisés.
                </p>
              ) : (
                <div className="space-y-2">
                  {filters.custom_filters?.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      data-testid={`custom-filter-${filter.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: filter.color }}
                        />
                        <span className="font-medium">{filter.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFilter(filter.id, filter.name)}
                        className="text-stone-400 hover:text-destructive"
                        data-testid={`delete-filter-${filter.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Default Filters Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
                Filtres par défaut
              </h4>
              <div className="flex flex-wrap gap-2">
                {filters.default_filters?.map((filter) => (
                  <span
                    key={filter.id}
                    className="px-3 py-1 rounded-full text-sm text-white"
                    style={{ backgroundColor: filter.color }}
                  >
                    {filter.name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;
