// Service de stockage local pour les recettes
const LOCAL_STORAGE_KEY = 'cooking_capture_local_data';
const LOCAL_STORAGE_ENABLED_KEY = 'cooking_capture_local_enabled';

export const localStorageService = {
  // Vérifier si le stockage local est activé
  isEnabled: () => {
    return localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY) === 'true';
  },

  // Activer/désactiver le stockage local
  setEnabled: (enabled) => {
    localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, enabled ? 'true' : 'false');
    if (!enabled) {
      // Supprimer les données locales si désactivé
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  },

  // Sauvegarder les recettes localement
  saveRecipes: (recipes) => {
    if (!localStorageService.isEnabled()) return;
    try {
      const data = {
        recipes,
        lastSync: new Date().toISOString(),
        version: 1
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde locale:', error);
      return false;
    }
  },

  // Récupérer les recettes locales
  getRecipes: () => {
    if (!localStorageService.isEnabled()) return null;
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la lecture locale:', error);
      return null;
    }
  },

  // Exporter toutes les données en JSON
  exportData: () => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cooking-capture-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      return false;
    }
  },

  // Obtenir la taille des données stockées
  getStorageSize: () => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const bytes = new Blob([data]).size;
        if (bytes < 1024) return `${bytes} octets`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
      }
      return '0 octets';
    } catch (error) {
      return 'Inconnu';
    }
  },

  // Obtenir la date de dernière synchronisation
  getLastSync: () => {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.lastSync ? new Date(parsed.lastSync) : null;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // Supprimer toutes les données locales
  clearAll: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_ENABLED_KEY);
  }
};

export default localStorageService;
