# Cooking Capture - PRD

## Problem Statement
Application complète de gestion de recettes de cuisine permettant de récupérer des recettes depuis des pages web, importer des documents, créer manuellement des recettes, et les organiser avec des filtres personnalisés.

## User Choices
1. Extraction via URL collée (avec nettoyage automatique des URLs)
2. Import de documents (PDF, Word, images)
3. Création manuelle de recettes
4. Service email: Resend
5. Système de filtres prédéfinis + personnalisés
6. PWA pour installation Android
7. Authentification avec prénom personnalisé
8. Upload d'images pour les recettes (compressées)

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **AI**: OpenAI GPT-4o (via Emergent LLM Key)
- **Email**: Resend API
- **PWA**: Service Worker + Web App Manifest
- **Images**: Pillow pour compression, stockage local
- **Carrousel**: embla-carousel-react

## Core Requirements
- [x] Extraire recettes depuis URL via IA
- [x] Importer recettes depuis documents (PDF, Word, images)
- [x] Extraire recettes depuis texte brut (sites protégés)
- [x] Créer recettes manuellement
- [x] Sauvegarder en base de données (MongoDB)
- [x] Afficher liste/répertoire des recettes
- [x] Afficher détail avec ingrédients et étapes
- [x] Édition en ligne des titres, ingrédients et étapes
- [x] Insertion d'étapes entre étapes existantes
- [x] Partage recette via lien public
- [x] Page publique pour recettes partagées (/public/recipe/:id)
- [x] Copie de recettes publiques vers son compte
- [x] PWA installable sur Android/iOS
- [x] Authentification utilisateur (inscription/connexion)
- [x] Filtres prédéfinis et personnalisés
- [x] Upload et gestion d'images pour recettes

## What's Been Implemented

### Phase 1-7 - MVP to Admin Dashboard
*Completed in previous sessions*

### Phase 8 - P1 Features (January 2026)
- [x] Bandeau carrousel des recettes publiques en haut de page
- [x] Toggle visibilité public/privé pour recettes manuelles
- [x] Bannière de consentement cookies
- [x] Formulaire de contact
- [x] Fonctions admin RGPD (modifier, export, envoi données)
- [x] Partage recette via mailto avec lien promo

### Phase 9 - Améliorations (January 2026)
- [x] Nouveau titre page d'accueil: "Capturez vos recettes en un instant et créez votre boîte à recettes"
- [x] Simplification du partage: lien unique vers page publique
- [x] Édition des titres de recettes
- [x] Insertion d'étapes de préparation
- [x] Extraction de recettes depuis texte brut (contournement sites protégés)
- [x] Correction bug NoneType extraction IA
- [x] Nouveau logo et favicon
- [x] Page publique /public/recipe/:id avec copie de recette
- [x] Nettoyage code mort (RecipeSidebar, endpoint request obsolète)

## API Endpoints

### Authentication
- POST /api/auth/register - Inscription
- POST /api/auth/login - Connexion
- GET /api/auth/me - Utilisateur courant
- POST /api/auth/forgot-password - Demande de réinitialisation
- POST /api/auth/reset-password - Réinitialiser le mot de passe

### Public
- GET /api/recipes/public/recent - Dernières recettes publiques
- POST /api/contact - Formulaire de contact

### Admin (réservé à loicchampanay@gmail.com)
- GET /api/admin/stats - Statistiques du site
- GET /api/admin/users - Liste des utilisateurs
- POST /api/admin/users - Créer un utilisateur
- DELETE /api/admin/users/{id} - Supprimer un utilisateur
- DELETE /api/admin/users/by-email/{email} - Supprimer par email
- PUT /api/admin/users/{id} - Modifier utilisateur (RGPD rectification)
- GET /api/admin/users/{id}/export - Export données utilisateur
- POST /api/admin/users/{id}/send-data - Envoi données par email
- POST /api/admin/email - Envoyer un email à des destinataires
- POST /api/admin/email/all - Envoyer un email à tous les utilisateurs

### Recipes
- POST /api/recipes/extract - Extraire depuis URL
- POST /api/recipes/extract-text - Extraire depuis texte brut
- POST /api/recipes/upload - Importer document
- POST /api/recipes/manual - Création manuelle
- GET /api/recipes - Liste des recettes utilisateur
- GET /api/recipes/{id} - Détail recette
- PUT /api/recipes/{id} - Modifier recette (titre, étapes, ingrédients, is_public)
- DELETE /api/recipes/{id} - Supprimer recette
- POST /api/recipes/{id}/send-email - Envoyer par email
- POST /api/recipes/{id}/upload-image - Upload image
- DELETE /api/recipes/{id}/image - Supprimer image
- POST /api/recipes/{id}/copy - Copier recette publique vers son compte

### Filters
- GET /api/filters - Liste des filtres
- POST /api/filters - Créer filtre personnalisé
- DELETE /api/filters/{id} - Supprimer filtre

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "password_hash": "string",
  "custom_filters": [{"id": "uuid", "name": "string", "row": 3, "color": "#hex"}],
  "created_at": "datetime"
}
```

### recipes
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "string",
  "description": "string",
  "source_url": "string",
  "source_type": "url|manual|document|text|copied",
  "image_url": "string|null",
  "is_public": "boolean (default: false for manual, true for url)",
  "prep_time": "string",
  "cook_time": "string",
  "servings": "string",
  "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}],
  "steps": [{"step_number": 1, "instruction": "string"}],
  "tags": ["filter_id"],
  "created_at": "datetime"
}
```

## Test Reports
- /app/test_reports/iteration_7.json - P1 features tests (100% passed)
- /app/test_reports/iteration_8.json - Final validation (100% passed)

## Known Issues (Resolved)
- ~~Bug "je ne peux plus ouvrir les recettes"~~ - Non reproduit lors des tests

## Known Issues (Open)
- **P2**: Génération de PDF pour guide de déploiement échoue (caractères spéciaux avec pandoc)
- **P2**: Fragilité du processus de déploiement sur le VPS

## Prioritized Backlog

### P0 (Complete)
- [x] Recipe extraction from URL
- [x] Recipe storage and retrieval
- [x] Email sending
- [x] Authentication system
- [x] Filter system
- [x] Manual recipe creation
- [x] Document import
- [x] Inline editing (titre, ingrédients, étapes)
- [x] Step insertion
- [x] PWA configuration
- [x] Image upload for recipes
- [x] Password recovery
- [x] Admin dashboard
- [x] Legal pages
- [x] Public recipe page with copy functionality
- [x] Simplified sharing via public link

### P1 (Complete)
- [x] Bandeau carrousel des recettes
- [x] Toggle visibilité public/privé
- [x] Bannière cookies
- [x] Formulaire de contact
- [x] Fonctions admin RGPD
- [x] Extraction depuis texte brut

### P2 (Backlog)
- [ ] Conformité RGPD complète (case consentement, droit opposition)
- [ ] Recipe duplication
- [ ] Bulk recipe export
- [ ] Recipe search by ingredient
- [ ] Weekly meal planning
- [ ] Shopping list generation
- [ ] Push notifications
- [ ] Recipe rating/favorites
- [ ] Refactorisation server.py en modules

## Next Action Items
1. Améliorer le processus de déploiement VPS
2. Ajouter case consentement RGPD à l'inscription
3. Implémenter génération liste de courses
4. Considérer refactorisation backend en modules

## Files of Reference
- `/app/backend/server.py` - Main backend file (~1500 lines)
- `/app/frontend/src/pages/Home.jsx` - Home page with RecipeBanner
- `/app/frontend/src/components/RecipeBanner.jsx` - Public recipes carousel
- `/app/frontend/src/pages/RecipeDetail.jsx` - Recipe detail with editing
- `/app/frontend/src/pages/PublicRecipe.jsx` - Public recipe page
- `/app/frontend/src/pages/Directory.jsx` - Recipe directory
- `/app/frontend/src/context/AuthContext.jsx` - Authentication context

## 3rd Party Integrations
- **Resend**: Email service (sandbox mode - loicchampanay@gmail.com only)
- **Emergent LLM Key**: AI extraction via GPT-4o
- **Ko-fi**: Donation link in footer
