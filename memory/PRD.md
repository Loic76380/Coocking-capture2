# Cooking Capture - PRD

## Problem Statement
Application permettant de récupérer une recette sur une page Web, conserver les ingrédients, quantités et étapes, puis envoyer par email.

## User Choices
1. Extraction via URL collée
2. Service email: Resend
3. Répertoire avec sommaire des recettes + envoi email
4. Clé Emergent pour l'IA

## Architecture
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **AI**: OpenAI GPT-4o (via Emergent LLM Key)
- **Email**: Resend API

## Core Requirements
- [x] Extraire recettes depuis URL via IA
- [x] Sauvegarder en base de données (MongoDB)
- [x] Afficher liste/répertoire des recettes
- [x] Afficher détail avec ingrédients et étapes
- [x] Envoyer recette par email

## What's Been Implemented (January 2026)
- Complete recipe extraction via AI (GPT-4o)
- Recipe directory with card view
- Recipe detail page with ingredients, quantities, steps
- Email sending functionality (requires valid Resend API key)
- Beautiful organic/earthy design theme

## API Endpoints
- POST /api/recipes/extract - Extraire recette depuis URL
- GET /api/recipes - Liste des recettes
- GET /api/recipes/{id} - Détail recette
- DELETE /api/recipes/{id} - Supprimer recette
- POST /api/recipes/{id}/send-email - Envoyer par email

## Prioritized Backlog
### P0 (Done)
- Recipe extraction from URL
- Recipe storage and retrieval
- Email sending

### P1 (Next)
- Add valid Resend API key for email functionality
- Add recipe image extraction from source pages

### P2 (Future)
- Recipe search/filter
- Categories/tags
- Recipe editing
- Share via link

## Next Action Items
1. User needs to provide valid Resend API key (get from https://resend.com)
2. Consider adding recipe import from multiple URLs at once
3. Add recipe categories/tags for better organization
