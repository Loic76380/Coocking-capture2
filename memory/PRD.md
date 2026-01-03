# Cooking Capture - PRD

## Problem Statement
Application permettant de récupérer une recette sur une page Web, conserver les ingrédients, quantités et étapes, puis envoyer par email.

## User Choices
1. Extraction via URL collée
2. Service email: Resend
3. Répertoire avec sommaire des recettes + envoi email
4. Clé Emergent pour l'IA
5. PWA pour installation Android

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **AI**: OpenAI GPT-4o (via Emergent LLM Key)
- **Email**: Resend API
- **PWA**: Service Worker + Web App Manifest

## Core Requirements
- [x] Extraire recettes depuis URL via IA
- [x] Sauvegarder en base de données (MongoDB)
- [x] Afficher liste/répertoire des recettes
- [x] Afficher détail avec ingrédients et étapes
- [x] Envoyer recette par email
- [x] PWA installable sur Android/iOS

## What's Been Implemented (January 2026)
- Complete recipe extraction via AI (GPT-4o)
- Recipe directory with card view
- Recipe detail page with ingredients, quantities, steps
- Email sending functionality (requires valid Resend API key)
- Beautiful organic/earthy design theme
- **PWA Configuration**:
  - Web App Manifest (manifest.json)
  - Service Worker for offline caching
  - Install prompt banner
  - App icons (SVG format)
  - iOS/Android compatible

## API Endpoints
- POST /api/recipes/extract - Extraire recette depuis URL
- GET /api/recipes - Liste des recettes
- GET /api/recipes/{id} - Détail recette
- DELETE /api/recipes/{id} - Supprimer recette
- POST /api/recipes/{id}/send-email - Envoyer par email

## PWA Installation Instructions
### Android
1. Ouvrir le site dans Chrome
2. Appuyer sur "Installer" dans la bannière ou Menu > "Ajouter à l'écran d'accueil"

### iOS (Safari)
1. Ouvrir le site dans Safari
2. Appuyer sur le bouton Partager
3. Sélectionner "Sur l'écran d'accueil"

## Prioritized Backlog
### P0 (Done)
- Recipe extraction from URL
- Recipe storage and retrieval
- Email sending
- PWA configuration

### P1 (Next)
- Add valid Resend API key for email functionality
- Add recipe image extraction from source pages

### P2 (Future)
- Recipe search/filter
- Categories/tags
- Recipe editing
- Share via link
- Push notifications

## Next Action Items
1. User needs to provide valid Resend API key (get from https://resend.com)
2. Test PWA installation on real Android device
3. Consider adding push notifications for recipe sharing
