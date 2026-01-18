#!/bin/bash
#===============================================================================
# Script de déploiement automatisé - Cooking Capture
# Compatible avec Ubuntu 20.04+ / Debian 11+
#===============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

#===============================================================================
# CONFIGURATION - À MODIFIER
#===============================================================================
DOMAIN=""
EMAIL=""
MONGO_USER="cookingadmin"
MONGO_PASS=""
JWT_SECRET=""
EMERGENT_LLM_KEY="sk-emergent-4Eb7eEbFf92C80aDeA"
RESEND_API_KEY="re_ZBekRpzK_5B9PDAqBmLvJ9pz1GeYTzs9t"
SENDER_EMAIL="onboarding@resend.dev"

#===============================================================================
# VERIFICATION DES PARAMETRES
#===============================================================================
show_usage() {
    echo "Usage: $0 --domain DOMAIN --email EMAIL [OPTIONS]"
    echo ""
    echo "Paramètres obligatoires:"
    echo "  --domain      Nom de domaine (ex: cooking.monsite.com)"
    echo "  --email       Email pour Let's Encrypt"
    echo ""
    echo "Paramètres optionnels:"
    echo "  --mongo-pass  Mot de passe MongoDB (généré automatiquement si non fourni)"
    echo "  --jwt-secret  Secret JWT (généré automatiquement si non fourni)"
    echo "  --llm-key     Clé Emergent LLM"
    echo "  --resend-key  Clé API Resend"
    echo ""
    echo "Exemple:"
    echo "  $0 --domain recettes.monsite.fr --email mon@email.com"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        --mongo-pass) MONGO_PASS="$2"; shift 2 ;;
        --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
        --llm-key) EMERGENT_LLM_KEY="$2"; shift 2 ;;
        --resend-key) RESEND_API_KEY="$2"; shift 2 ;;
        -h|--help) show_usage ;;
        *) echo "Option inconnue: $1"; show_usage ;;
    esac
done

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    print_error "Les paramètres --domain et --email sont obligatoires"
    show_usage
fi

# Générer les secrets si non fournis
[ -z "$MONGO_PASS" ] && MONGO_PASS=$(openssl rand -hex 16)
[ -z "$JWT_SECRET" ] && JWT_SECRET=$(openssl rand -hex 32)

#===============================================================================
# INSTALLATION
#===============================================================================
APP_DIR="/opt/cooking-capture"

print_status "Démarrage du déploiement de Cooking Capture"
print_status "Domaine: $DOMAIN"
print_status "Email: $EMAIL"

# Mise à jour système
print_status "Mise à jour du système..."
apt-get update && apt-get upgrade -y

# Installation des dépendances
print_status "Installation des dépendances..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    nginx \
    certbot \
    python3-certbot-nginx

# Installation Docker
if ! command -v docker &> /dev/null; then
    print_status "Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installé"
else
    print_success "Docker déjà installé"
fi

# Installation Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installation de Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installé"
else
    print_success "Docker Compose déjà installé"
fi

# Création du répertoire de l'application
print_status "Création du répertoire de l'application..."
mkdir -p $APP_DIR
cd $APP_DIR

# Création du fichier docker-compose.yml
print_status "Création de la configuration Docker..."
cat > docker-compose.yml << 'DOCKER_COMPOSE'
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: cooking-mongodb
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASS}
      MONGO_INITDB_DATABASE: cooking_capture
    volumes:
      - mongodb_data:/data/db
    networks:
      - cooking-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cooking-backend
    restart: always
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://${MONGO_USER}:${MONGO_PASS}@mongodb:27017/cooking_capture?authSource=admin
      - DB_NAME=cooking_capture
      - EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - SENDER_EMAIL=${SENDER_EMAIL}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=https://${DOMAIN}
      - FRONTEND_URL=https://${DOMAIN}
    depends_on:
      - mongodb
    volumes:
      - uploads_data:/app/uploads
    networks:
      - cooking-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_BACKEND_URL=https://${DOMAIN}
    container_name: cooking-frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - cooking-network

volumes:
  mongodb_data:
  uploads_data:

networks:
  cooking-network:
    driver: bridge
DOCKER_COMPOSE

# Création du fichier .env
print_status "Création du fichier .env..."
cat > .env << ENVFILE
DOMAIN=${DOMAIN}
MONGO_USER=${MONGO_USER}
MONGO_PASS=${MONGO_PASS}
JWT_SECRET=${JWT_SECRET}
EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY}
RESEND_API_KEY=${RESEND_API_KEY}
SENDER_EMAIL=${SENDER_EMAIL}
ENVFILE

# Création du Dockerfile backend
print_status "Création du Dockerfile backend..."
mkdir -p backend
cat > backend/Dockerfile << 'DOCKERFILE_BACKEND'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
DOCKERFILE_BACKEND

# Création du Dockerfile frontend
print_status "Création du Dockerfile frontend..."
mkdir -p frontend
cat > frontend/Dockerfile << 'DOCKERFILE_FRONTEND'
FROM node:18-alpine as build

WORKDIR /app

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE_FRONTEND

# Création du nginx.conf pour le frontend (dans le container)
cat > frontend/nginx.conf << 'NGINX_FRONTEND'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_FRONTEND

# Configuration Nginx (reverse proxy)
print_status "Configuration de Nginx..."
cat > /etc/nginx/sites-available/cooking-capture << NGINX_CONFIG
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 20M;
    }
}
NGINX_CONFIG

# Activer le site
ln -sf /etc/nginx/sites-available/cooking-capture /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test de la configuration Nginx
nginx -t

# Redémarrage de Nginx
systemctl restart nginx

print_success "Configuration Nginx terminée"

#===============================================================================
# MESSAGE FINAL
#===============================================================================
echo ""
echo "==========================================================================="
print_success "Configuration initiale terminée !"
echo "==========================================================================="
echo ""
echo "PROCHAINES ÉTAPES :"
echo ""
echo "1. Copiez les fichiers de votre application dans ${APP_DIR}/"
echo "   - backend/  (contenu du dossier backend)"
echo "   - frontend/ (contenu du dossier frontend)"
echo ""
echo "2. Lancez l'application :"
echo "   cd ${APP_DIR}"
echo "   docker-compose up -d --build"
echo ""
echo "3. Configurez HTTPS (après avoir pointé le DNS) :"
echo "   certbot --nginx -d ${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive"
echo ""
echo "==========================================================================="
echo "INFORMATIONS DE CONNEXION MONGODB :"
echo "  Utilisateur: ${MONGO_USER}"
echo "  Mot de passe: ${MONGO_PASS}"
echo ""
echo "SECRET JWT: ${JWT_SECRET}"
echo "==========================================================================="
echo ""
echo "Ces informations sont sauvegardées dans ${APP_DIR}/.env"
echo ""
