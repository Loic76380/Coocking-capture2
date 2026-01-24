#!/bin/bash
#===============================================================================
# MISE À JOUR COOKING CAPTURE - VPS OVH
# 
# ÉTAPE 1: Sauvegardez d'abord sur GitHub depuis Emergent (bouton "Save to Github")
# ÉTAPE 2: Copiez-collez ce script dans votre terminal
#===============================================================================

echo "========================================"
echo "  MISE À JOUR COOKING CAPTURE"
echo "========================================"

# Connexion SSH
ssh ubuntu@51.210.242.96 << 'ENDSSH'
sudo -i

cd /opt/cooking-capture

echo "[1/7] Arrêt des containers..."
docker-compose down

echo "[2/7] Suppression des anciens fichiers..."
rm -rf backend frontend

echo "[3/7] Téléchargement du nouveau code..."
git clone https://github.com/Loic76380/coocking-capture2.git temp
cp -r temp/backend ./backend
cp -r temp/frontend ./frontend
rm -rf temp

echo "[4/7] Création du Dockerfile backend..."
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

echo "[5/7] Création du Dockerfile frontend..."
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

echo "[6/7] Nettoyage requirements.txt..."
sed -i '/emergentintegrations/d' backend/requirements.txt

echo "[7/7] Reconstruction et démarrage..."
docker-compose up -d --build

echo ""
echo "========================================"
echo "  MISE À JOUR TERMINÉE !"
echo "========================================"
docker-compose ps

ENDSSH
