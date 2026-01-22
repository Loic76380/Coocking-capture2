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
- [x] Envoyer recette par email (mailto: avec lien promotionnel)
- [x] PWA installable sur Android/iOS
- [x] Authentification utilisateur (inscription/connexion)
- [x] Filtres prédéfinis et personnalisés
- [x] Upload et gestion d'images pour recettes

## What's Been Implemented

### Phase 1-7 - MVP to Admin Dashboard
*Completed in previous sessions - See CHANGELOG.md for details*

### Phase 8 - P1 Features Batch (22 January 2026)

#### Bandeau Latéral des Dernières Recettes
- [x] Composant `RecipeSidebar.jsx` créé avec liste scrollable
- [x] Intégration dans `Home.jsx` (visible sur desktop, caché mobile)
- [x] API `GET /api/recipes/public/recent` retourne recettes publiques
- [x] Clic sur recette URL → ouvre le site d'origine
- [x] Clic sur recette manuelle → dialogue de demande de recette

#### Toggle Visibilité Public/Privé
- [x] Section "Visibilité" ajoutée dans `RecipeDetail.jsx`
- [x] Switch toggle avec icône Globe (public) / EyeOff (privé)
- [x] Champ `is_public` ajouté au modèle `RecipeUpdate`
- [x] Route `PUT /api/recipes/{id}` supporte `is_public`
- [x] Recettes publiques apparaissent dans le sidebar

#### Bannière de Consentement Cookies
- [x] Composant `CookieBanner.jsx` créé
- [x] Explique l'utilisation des cookies techniques
- [x] Boutons "Accepter" et "Refuser"
- [x] Mémorise le choix dans localStorage
- [x] S'affiche une seule fois par utilisateur

#### Formulaire de Contact
- [x] Page `/contact` avec formulaire
- [x] Route `POST /api/contact` envoie email à l'admin
- [x] L'adresse email admin n'est pas exposée au frontend
- [x] Confirmation visuelle après envoi

#### Fonctions Admin RGPD
- [x] `PUT /api/admin/users/{id}` - Modifier utilisateur (droit de rectification)
- [x] `GET /api/admin/users/{id}/export` - Export données JSON
- [x] `POST /api/admin/users/{id}/send-data` - Envoi données par email (portabilité)
- [x] Interface dans Admin.jsx avec boutons pour chaque action

#### Partage de Recette Amélioré
- [x] Utilise `mailto:` avec l'app email de l'utilisateur
- [x] Inclut lien promotionnel vers https://coocking-capture.fr
- [x] Options : Email, Partage natif (Web Share API), Copier

#### Suppression Logo Emergent
- [x] Badge Emergent commenté dans `index.html`

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
- POST /api/recipes/upload - Importer document
- POST /api/recipes/manual - Création manuelle
- GET /api/recipes - Liste des recettes
- GET /api/recipes/{id} - Détail recette
- PUT /api/recipes/{id} - Modifier recette (incl. is_public)
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
  "is_public": "boolean (default: false)",
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
- /app/test_reports/iteration_7.json - P1 features tests (17/17 passed, 100% frontend)

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

### P1 (Complete - 22 January 2026)
- [x] Bandeau latéral dernières recettes
- [x] Toggle visibilité public/privé
- [x] Bannière cookies
- [x] Formulaire de contact
- [x] Fonctions admin RGPD (modifier, export, envoi données)
- [x] Partage recette via mailto avec lien promo
- [x] Retirer logo Emergent

### P2 (Next)
- [ ] Conformité RGPD complète:
  - [ ] Case à cocher consentement inscription
  - [ ] Droit d'opposition (désinscription communications)
- [ ] Email individuel amélioré depuis admin
- [ ] Recipe sharing via public link
- [ ] Recipe duplication
- [ ] Bulk recipe export
- [ ] Recipe search by ingredient
- [ ] Weekly meal planning
- [ ] Shopping list generation
- [ ] Push notifications
- [ ] Recipe rating/favorites

## Next Action Items
1. Ajouter case à cocher consentement RGPD à l'inscription
2. Implémenter le droit d'opposition aux communications
3. Tester le déploiement sur VPS avec les nouvelles fonctionnalités
4. Considérer l'ajout d'une fonctionnalité de liste de courses

## Files of Reference
- `/app/backend/server.py` - Main backend file (1600+ lines - needs refactoring)
- `/app/frontend/src/pages/Home.jsx` - Home page with RecipeSidebar
- `/app/frontend/src/components/RecipeSidebar.jsx` - Public recipes sidebar
- `/app/frontend/src/pages/RecipeDetail.jsx` - Recipe detail with visibility toggle
- `/app/frontend/src/components/CookieBanner.jsx` - Cookie consent banner
- `/app/frontend/src/pages/Contact.jsx` - Contact form
- `/app/frontend/src/pages/Admin.jsx` - Admin dashboard with RGPD functions
- `/app/frontend/src/components/Footer.jsx` - Footer with legal links and Ko-fi
