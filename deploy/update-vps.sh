#!/bin/bash
#===============================================================================
# Script de mise à jour - Cooking Capture
# VPS: 51.210.242.96
# Exécuter après avoir sauvegardé sur GitHub depuis Emergent
#===============================================================================

# Connexion et passage en root
ssh ubuntu@51.210.242.96 << 'ENDSSH'
sudo -i

cd /opt/cooking-capture

echo "=========================================="
echo "  MISE À JOUR COOKING CAPTURE"
echo "=========================================="

# Arrêter les containers
echo "[1/6] Arrêt des containers..."
docker-compose down

# Supprimer les anciens fichiers
echo "[2/6] Suppression des anciens fichiers..."
rm -rf backend frontend

# Cloner le nouveau code depuis GitHub
echo "[3/6] Téléchargement du nouveau code..."
git clone https://github.com/Loic76380/coocking-capture2.git temp
cp -r temp/backend ./backend
cp -r temp/frontend ./frontend
rm -rf temp

# Créer le Dockerfile backend
echo "[4/6] Création du Dockerfile backend..."
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc libffi-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ emergentintegrations
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/uploads
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
EOF

# Créer le Dockerfile frontend
echo "[5/6] Création du Dockerfile frontend..."
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build
WORKDIR /app
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
COPY package.json ./
RUN npm install --legacy-peer-deps && npm install ajv@8 ajv-keywords@5 --legacy-peer-deps
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Nettoyer requirements.txt
sed -i '/emergentintegrations/d' backend/requirements.txt

# Reconstruire et relancer
echo "[6/6] Reconstruction et démarrage..."
docker-compose up -d --build

echo ""
echo "=========================================="
echo "  MISE À JOUR TERMINÉE !"
echo "=========================================="
echo ""
docker-compose ps
echo ""

ENDSSH
