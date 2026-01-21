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

## Core Requirements
- [x] Extraire recettes depuis URL via IA
- [x] Importer recettes depuis documents (PDF, Word, images)
- [x] Créer recettes manuellement
- [x] Sauvegarder en base de données (MongoDB)
- [x] Afficher liste/répertoire des recettes
- [x] Afficher détail avec ingrédients et étapes
- [x] Édition en ligne des ingrédients et étapes
- [x] Envoyer recette par email
- [x] PWA installable sur Android/iOS
- [x] Authentification utilisateur (inscription/connexion)
- [x] Filtres prédéfinis et personnalisés
- [x] Upload et gestion d'images pour recettes

## What's Been Implemented (January 2026)

### Phase 1 - MVP
- Complete recipe extraction via AI (GPT-4o)
- Recipe directory with card view
- Recipe detail page with ingredients, quantities, steps
- Email sending functionality (Resend API)
- Beautiful organic/earthy design theme

### Phase 2 - Authentication & Filters
- User registration and login (JWT)
- Private recipes per user
- Account management page with first name
- Default filters: Apéro, Entrées, Plats, Desserts, Salade, Petites envies, Sauces, Salé, Sucré, Viande, Poisson
- Custom filters creation with color picker
- Tag recipes with categories
- Filter recipes in directory view

### Phase 3 - Creation & Editing
- Manual recipe creation form
- Document import (PDF, Word, images)
- Inline editing of ingredients and steps
- URL auto-cleaning (removes text before http/https)
- Personalized page title "La boîte à recettes de [prénom]"

### Phase 4 - PWA
- Service Worker configuration
- Web App Manifest
- Install prompt component
- Offline-capable

### Phase 5 - Image Upload (10 January 2026)
- Image upload for recipes (POST /api/recipes/{id}/upload-image)
- Automatic image compression (Pillow, max 1200px, JPEG quality 85%)
- Image display on recipe cards (Directory.jsx)
- Image management on detail page (upload/modify/delete)
- Image deletion endpoint (DELETE /api/recipes/{id}/image)
- Static file serving (/api/uploads/{filename})

### Phase 6 - Password Recovery (10 January 2026)
- Forgot password flow (POST /api/auth/forgot-password)
- Password reset via email link (POST /api/auth/reset-password)
- Reset token valid for 1 hour
- Beautiful HTML email template for password reset
- Reset password page (/reset-password)

### Phase 7 - Admin Dashboard (18 January 2026)
- Admin-only page (/admin) accessible only to loicchampanay@gmail.com
- Statistics dashboard: users, recipes, images, sources breakdown
- User management: create and delete users
- Activity view: recent users and recipes
- Emailing system: send emails to specific users or all users
- API endpoints: /api/admin/stats, /api/admin/users, /api/admin/email

### Phase 8 - Legal & Privacy (19 January 2026)
- Legal page (/legal) with mentions légales
- Privacy policy page (/privacy) with RGPD compliance
- Local storage option for offline recipe access
- Export data functionality (JSON format)
- Ko-fi donation button in footer
- Footer with legal links

## API Endpoints
### Authentication
- POST /api/auth/register - Inscription
- POST /api/auth/login - Connexion
- GET /api/auth/me - Utilisateur courant
- POST /api/auth/forgot-password - Demande de réinitialisation
- POST /api/auth/reset-password - Réinitialiser le mot de passe

### Admin (réservé à loicchampanay@gmail.com)
- GET /api/admin/stats - Statistiques du site
- GET /api/admin/users - Liste des utilisateurs
- POST /api/admin/users - Créer un utilisateur
- DELETE /api/admin/users/{id} - Supprimer un utilisateur
- DELETE /api/admin/users/by-email/{email} - Supprimer par email
- POST /api/admin/email - Envoyer un email à des destinataires
- POST /api/admin/email/all - Envoyer un email à tous les utilisateurs

### Recipes
- POST /api/recipes/extract - Extraire depuis URL
- POST /api/recipes/upload - Importer document
- POST /api/recipes/manual - Création manuelle
- GET /api/recipes - Liste des recettes
- GET /api/recipes/{id} - Détail recette
- PUT /api/recipes/{id} - Modifier recette
- DELETE /api/recipes/{id} - Supprimer recette
- POST /api/recipes/{id}/send-email - Envoyer par email
- POST /api/recipes/{id}/upload-image - Upload image
- DELETE /api/recipes/{id}/image - Supprimer image

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
  "source_type": "url|manual|document",
  "image_url": "string|null",
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
- /app/test_reports/iteration_6.json - Image upload tests (13/13 passed)

## Known Issues
- **P2**: Génération de PDF pour guide de déploiement échoue (caractères spéciaux avec pandoc)

## Prioritized Backlog

### P0 (Complete)
- [x] Recipe extraction from URL
- [x] Recipe storage and retrieval
- [x] Email sending
- [x] Authentication system
- [x] Filter system
- [x] Manual recipe creation
- [x] Document import
- [x] Inline editing
- [x] PWA configuration
- [x] Image upload for recipes
- [x] Password recovery
- [x] Admin dashboard
- [x] Legal pages (mentions légales, politique confidentialité)
- [x] Local storage option
- [x] Ko-fi donation button

### P1 (Next - User Requested)
- [ ] **Bouton Contact** : Formulaire de contact sans dévoiler l'adresse email (utiliser un formulaire qui envoie via l'API backend)
- [ ] **Admin - Export données utilisateur** : Permettre d'envoyer à un utilisateur un package avec toutes ses données personnelles (conformité RGPD - droit à la portabilité)
- [ ] **Admin - Email individuel amélioré** : Interface dédiée pour écrire à une seule personne avec historique
- [ ] **Retirer logo Emergent** : Supprimer la mention "Made with Emergent" de l'application
- [ ] **Admin - Modifier données utilisateur** : Permettre de corriger les données d'un utilisateur (RGPD - droit de rectification)
- [ ] **Conformité RGPD complète** :
  - Droit d'accès : voir toutes ses données ✅ (via export)
  - Droit de rectification : modifier ses données (à implémenter côté admin)
  - Droit à l'effacement : supprimer son compte ✅ (via admin)
  - Droit à la portabilité : exporter ses données (à implémenter)
  - Droit d'opposition : se désinscrire des communications
  - Droit à la limitation : geler le traitement des données
  - Consentement explicite : case à cocher à l'inscription

### P2 (Future)
- [ ] Recipe sharing via public link
- [ ] Recipe duplication
- [ ] Bulk recipe export
- [ ] Recipe search by ingredient
- [ ] Weekly meal planning
- [ ] Shopping list generation
- [ ] Push notifications
- [ ] Recipe rating/favorites

## Next Action Items
1. Test PWA installation on real Android device
2. Consider adding recipe sharing functionality
3. Implement shopping list from recipe ingredients

## Files of Reference
- `/app/backend/server.py` - Main backend file
- `/app/frontend/src/pages/Directory.jsx` - Recipe list
- `/app/frontend/src/pages/RecipeDetail.jsx` - Recipe detail with image
- `/app/frontend/src/pages/Home.jsx` - Home page
- `/app/frontend/src/pages/Auth.jsx` - Login/Register
- `/app/frontend/src/pages/Account.jsx` - User account
- `/app/frontend/src/context/AuthContext.jsx` - Auth context
- `/app/tests/test_image_upload.py` - Image upload tests
