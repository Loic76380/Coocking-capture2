#!/bin/bash
#===============================================================================
# COOKING CAPTURE - Script de déploiement COMPLET V2
# Compatible Ubuntu 20.04+ / Debian 11+
# 
# Ce script installe tout automatiquement sur votre VPS OVH
#===============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  $1"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

# Vérification root
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root"
    echo "Utilisez: sudo $0 --domain VOTRE_DOMAINE --email VOTRE_EMAIL"
    exit 1
fi

#===============================================================================
# PARAMÈTRES
#===============================================================================
DOMAIN=""
EMAIL=""
GITHUB_REPO=""

show_usage() {
    print_header "COOKING CAPTURE - Déploiement VPS"
    echo "Usage: sudo $0 --domain DOMAINE --email EMAIL [--repo URL_GIT]"
    echo ""
    echo "Paramètres obligatoires:"
    echo "  --domain    Votre nom de domaine (ex: coocking-capture.fr)"
    echo "  --email     Votre email pour Let's Encrypt"
    echo ""
    echo "Paramètres optionnels:"
    echo "  --repo      URL du repository Git (si vous avez sauvegardé sur GitHub)"
    echo ""
    echo "Exemples:"
    echo "  sudo $0 --domain coocking-capture.fr --email contact@example.com"
    echo "  sudo $0 --domain coocking-capture.fr --email contact@example.com --repo https://github.com/user/repo.git"
    echo ""
    exit 1
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) DOMAIN="$2"; shift 2 ;;
        --email) EMAIL="$2"; shift 2 ;;
        --repo) GITHUB_REPO="$2"; shift 2 ;;
        -h|--help) show_usage ;;
        *) shift ;;
    esac
done

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    show_usage
fi

#===============================================================================
# VARIABLES
#===============================================================================
APP_DIR="/opt/cooking-capture"
MONGO_USER="cookingadmin"
MONGO_PASS=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "VOTRE_IP")

# Clés API (à remplacer par les vôtres en production)
EMERGENT_LLM_KEY="sk-emergent-4Eb7eEbFf92C80aDeA"
RESEND_API_KEY="re_ZBekRpzK_5B9PDAqBmLvJ9pz1GeYTzs9t"
SENDER_EMAIL="onboarding@resend.dev"

print_header "COOKING CAPTURE - Installation automatique"
echo "Domaine: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo "IP Serveur: ${SERVER_IP}"
echo ""

#===============================================================================
# ÉTAPE 1: Mise à jour système
#===============================================================================
print_status "Étape 1/8: Mise à jour du système..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "Système mis à jour"

#===============================================================================
# ÉTAPE 2: Installation des dépendances
#===============================================================================
print_status "Étape 2/8: Installation des dépendances..."
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
    unzip \
    htop
print_success "Dépendances installées"

#===============================================================================
# ÉTAPE 3: Installation de Docker
#===============================================================================
print_status "Étape 3/8: Installation de Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installé"
else
    print_success "Docker déjà présent"
fi

#===============================================================================
# ÉTAPE 4: Installation de Docker Compose
#===============================================================================
print_status "Étape 4/8: Installation de Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -oP '"tag_name": "\K(.*)(?=")')
    curl -sL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installé"
else
    print_success "Docker Compose déjà présent"
fi

#===============================================================================
# ÉTAPE 5: Création de la structure
#===============================================================================
print_status "Étape 5/8: Création de la structure de l'application..."
mkdir -p $APP_DIR/{backend,frontend}
cd $APP_DIR

# Fichier .env principal
cat > .env << EOF
# Configuration Cooking Capture
DOMAIN=${DOMAIN}
MONGO_USER=${MONGO_USER}
MONGO_PASS=${MONGO_PASS}
JWT_SECRET=${JWT_SECRET}
EMERGENT_LLM_KEY=${EMERGENT_LLM_KEY}
RESEND_API_KEY=${RESEND_API_KEY}
SENDER_EMAIL=${SENDER_EMAIL}
EOF

# docker-compose.yml optimisé
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
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

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
      - CORS_ORIGINS=https://${DOMAIN},http://${DOMAIN}
      - FRONTEND_URL=https://${DOMAIN}
    depends_on:
      mongodb:
        condition: service_healthy
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
# ÉTAPE 6: Dockerfiles
#===============================================================================
print_status "Étape 6/8: Création des Dockerfiles..."

# Dockerfile Backend
cat > $APP_DIR/backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Requirements Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code application
COPY . .

# Dossier uploads
RUN mkdir -p /app/uploads

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF

# Dockerfile Frontend
cat > $APP_DIR/frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build

WORKDIR /app

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

# Copier package.json et installer
COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci --legacy-peer-deps; \
    else npm install --legacy-peer-deps; fi

# Copier le code et builder
COPY . .
RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

# Image finale Nginx
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Configuration Nginx pour SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
    location /static { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

print_success "Dockerfiles créés"

#===============================================================================
# ÉTAPE 7: Configuration Nginx (reverse proxy)
#===============================================================================
print_status "Étape 7/8: Configuration de Nginx..."

cat > /etc/nginx/sites-available/cooking-capture << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Taille max upload (pour les images)
    client_max_body_size 20M;

    # Frontend
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

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
NGINX

# Activer le site
ln -sf /etc/nginx/sites-available/cooking-capture /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et redémarrer Nginx
nginx -t && systemctl restart nginx
print_success "Nginx configuré"

#===============================================================================
# ÉTAPE 8: Scripts de gestion
#===============================================================================
print_status "Étape 8/8: Création des scripts de gestion..."

# Script de mise à jour
cat > $APP_DIR/update.sh << 'SCRIPT'
#!/bin/bash
cd /opt/cooking-capture
echo "Arrêt des containers..."
docker-compose down
echo "Reconstruction et redémarrage..."
docker-compose up -d --build
echo "Nettoyage des images inutilisées..."
docker image prune -f
echo "Mise à jour terminée!"
SCRIPT
chmod +x $APP_DIR/update.sh

# Script de backup
cat > $APP_DIR/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/cooking-capture/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "Sauvegarde de la base de données..."
docker exec cooking-mongodb mongodump --archive=/tmp/backup.archive --gzip
docker cp cooking-mongodb:/tmp/backup.archive $BACKUP_DIR/mongodb_$DATE.archive

echo "Sauvegarde des uploads..."
docker cp cooking-backend:/app/uploads $BACKUP_DIR/uploads_$DATE

echo "Sauvegarde terminée dans $BACKUP_DIR"
ls -la $BACKUP_DIR
SCRIPT
chmod +x $APP_DIR/backup.sh

# Script de logs
cat > $APP_DIR/logs.sh << 'SCRIPT'
#!/bin/bash
case "$1" in
    backend) docker logs -f cooking-backend ;;
    frontend) docker logs -f cooking-frontend ;;
    mongodb) docker logs -f cooking-mongodb ;;
    all) docker-compose logs -f ;;
    *) echo "Usage: $0 {backend|frontend|mongodb|all}" ;;
esac
SCRIPT
chmod +x $APP_DIR/logs.sh

print_success "Scripts de gestion créés"

#===============================================================================
# INSTRUCTIONS FINALES
#===============================================================================
print_header "INSTALLATION TERMINÉE !"

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                    PROCHAINES ÉTAPES${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}1️⃣  COPIEZ VOS FICHIERS APPLICATION :${NC}"
echo ""
echo "   Depuis votre machine locale (ou depuis Emergent) :"
echo ""
echo "   scp -r backend/* root@${SERVER_IP}:${APP_DIR}/backend/"
echo "   scp -r frontend/* root@${SERVER_IP}:${APP_DIR}/frontend/"
echo ""
if [ -n "$GITHUB_REPO" ]; then
    echo "   Ou clonez votre repository :"
    echo "   cd ${APP_DIR} && git clone ${GITHUB_REPO} temp && mv temp/* . && rm -rf temp"
    echo ""
fi
echo -e "${YELLOW}2️⃣  POINTEZ VOTRE DNS :${NC}"
echo ""
echo "   Créez un enregistrement A :"
echo "   ${DOMAIN} → ${SERVER_IP}"
echo ""
echo -e "${YELLOW}3️⃣  LANCEZ L'APPLICATION :${NC}"
echo ""
echo "   cd ${APP_DIR}"
echo "   docker-compose up -d --build"
echo ""
echo -e "${YELLOW}4️⃣  ACTIVEZ HTTPS (après propagation DNS) :${NC}"
echo ""
echo "   certbot --nginx -d ${DOMAIN} --email ${EMAIL} --agree-tos -n"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                 INFORMATIONS IMPORTANTES${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📁 Répertoire: ${APP_DIR}"
echo ""
echo "🔐 MongoDB:"
echo "   User: ${MONGO_USER}"
echo "   Pass: ${MONGO_PASS}"
echo ""
echo "🔑 JWT Secret: ${JWT_SECRET:0:20}..."
echo ""
echo "📄 Fichier .env: ${APP_DIR}/.env"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                  COMMANDES UTILES${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Voir les logs:     ${APP_DIR}/logs.sh backend"
echo "🔄 Mettre à jour:     ${APP_DIR}/update.sh"
echo "💾 Sauvegarder:       ${APP_DIR}/backup.sh"
echo "🔄 Redémarrer:        cd ${APP_DIR} && docker-compose restart"
echo "⏹️  Arrêter:           cd ${APP_DIR} && docker-compose down"
echo ""
