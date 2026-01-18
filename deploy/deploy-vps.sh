#!/bin/bash
#===============================================================================
# Script de déploiement COMPLET - Cooking Capture
# Ce script télécharge et déploie toute l'application automatiquement
#===============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Vérifier si root
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root (sudo)"
    exit 1
fi

# Paramètres
DOMAIN=""
EMAIL=""

show_usage() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║       COOKING CAPTURE - Script de déploiement VPS            ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Usage: sudo $0 --domain VOTRE_DOMAINE --email VOTRE_EMAIL"
    echo ""
    echo "Exemple:"
    echo "  sudo $0 --domain recettes.monsite.fr --email contact@monsite.fr"
    echo ""
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        -h|--help) show_usage ;;
        *) shift ;;
    esac
done

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    show_usage
fi

APP_DIR="/opt/cooking-capture"
MONGO_USER="cookingadmin"
MONGO_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       COOKING CAPTURE - Déploiement automatique              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
print_status "Domaine: $DOMAIN"
print_status "Email: $EMAIL"
echo ""

#===============================================================================
# ÉTAPE 1: Mise à jour et installation des dépendances
#===============================================================================
print_status "Étape 1/7: Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq

print_status "Installation des dépendances..."
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    unzip

print_success "Dépendances installées"

#===============================================================================
# ÉTAPE 2: Installation de Docker
#===============================================================================
print_status "Étape 2/7: Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi
print_success "Docker prêt"

#===============================================================================
# ÉTAPE 3: Installation de Docker Compose
#===============================================================================
print_status "Étape 3/7: Installation de Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -sL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi
print_success "Docker Compose prêt"

#===============================================================================
# ÉTAPE 4: Création de la structure de l'application
#===============================================================================
print_status "Étape 4/7: Création de la structure..."
mkdir -p $APP_DIR/{backend,frontend}
cd $APP_DIR

# Fichier .env
cat > .env << EOF
DOMAIN=${DOMAIN}
MONGO_USER=${MONGO_USER}
MONGO_PASS=${MONGO_PASS}
JWT_SECRET=${JWT_SECRET}
EMERGENT_LLM_KEY=sk-emergent-4Eb7eEbFf92C80aDeA
RESEND_API_KEY=re_ZBekRpzK_5B9PDAqBmLvJ9pz1GeYTzs9t
SENDER_EMAIL=onboarding@resend.dev
EOF

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
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
      - app-network

  backend:
    build: ./backend
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
      - app-network

  frontend:
    build:
      context: ./frontend
      args:
        - REACT_APP_BACKEND_URL=https://${DOMAIN}
    container_name: cooking-frontend
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  mongodb_data:
  uploads_data:

networks:
  app-network:
    driver: bridge
EOF

print_success "Structure créée"

#===============================================================================
# ÉTAPE 5: Configuration Nginx
#===============================================================================
print_status "Étape 5/7: Configuration de Nginx..."

cat > /etc/nginx/sites-available/cooking-capture << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 20M;

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
    }
}
EOF

ln -sf /etc/nginx/sites-available/cooking-capture /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

print_success "Nginx configuré"

#===============================================================================
# ÉTAPE 6: Message pour copie des fichiers
#===============================================================================
print_status "Étape 6/7: Préparation des Dockerfiles..."

# Dockerfile backend
cat > $APP_DIR/backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libffi-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF

# Dockerfile frontend
cat > $APP_DIR/frontend/Dockerfile << 'EOF'
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
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

print_success "Dockerfiles créés"

#===============================================================================
# ÉTAPE 7: Instructions finales
#===============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    INSTALLATION TERMINÉE                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Répertoire de l'application: ${APP_DIR}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                    PROCHAINES ÉTAPES"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  COPIEZ VOS FICHIERS D'APPLICATION :"
echo ""
echo "    Depuis votre machine locale, exécutez :"
echo ""
echo "    scp -r /chemin/vers/backend/* root@VOTRE_IP:${APP_DIR}/backend/"
echo "    scp -r /chemin/vers/frontend/* root@VOTRE_IP:${APP_DIR}/frontend/"
echo ""
echo "    Ou téléchargez depuis Emergent (Save to Github puis git clone)"
echo ""
echo "2️⃣  POINTEZ VOTRE DNS vers cette IP :"
echo "    Ajoutez un enregistrement A : ${DOMAIN} → $(curl -s ifconfig.me)"
echo ""
echo "3️⃣  LANCEZ L'APPLICATION :"
echo "    cd ${APP_DIR}"
echo "    docker-compose up -d --build"
echo ""
echo "4️⃣  ACTIVEZ HTTPS (après propagation DNS) :"
echo "    certbot --nginx -d ${DOMAIN} --email ${EMAIL} --agree-tos -n"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                 INFORMATIONS IMPORTANTES"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🔐 MongoDB:"
echo "   Utilisateur: ${MONGO_USER}"
echo "   Mot de passe: ${MONGO_PASS}"
echo ""
echo "🔑 JWT Secret: ${JWT_SECRET}"
echo ""
echo "📄 Ces informations sont sauvegardées dans: ${APP_DIR}/.env"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
