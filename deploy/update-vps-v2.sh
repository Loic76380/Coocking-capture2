#!/bin/bash
#===============================================================================
# MISE À JOUR COMPLÈTE COOKING CAPTURE
# Inclut: Code + Nginx pour coocking-capture.fr ET www.coocking-capture.fr
#===============================================================================

echo "========================================"
echo "  MISE À JOUR COOKING CAPTURE"
echo "  Domaines: coocking-capture.fr + www"
echo "========================================"

cd /opt/cooking-capture

echo "[1/8] Arrêt des containers..."
docker-compose down

echo "[2/8] Suppression des anciens fichiers..."
rm -rf backend frontend

echo "[3/8] Téléchargement du nouveau code..."
git clone https://github.com/Loic76380/coocking-capture2.git temp
cp -r temp/backend ./backend
cp -r temp/frontend ./frontend
rm -rf temp

echo "[4/8] Création du Dockerfile backend..."
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

echo "[5/8] Création du Dockerfile frontend..."
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

echo "[6/8] Nettoyage requirements.txt..."
sed -i '/emergentintegrations/d' backend/requirements.txt

echo "[7/8] Configuration Nginx pour les deux domaines..."
cat > /etc/nginx/sites-available/cooking-capture << 'NGINX'
server {
    listen 80;
    server_name coocking-capture.fr www.coocking-capture.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name coocking-capture.fr www.coocking-capture.fr;

    ssl_certificate /etc/letsencrypt/live/coocking-capture.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coocking-capture.fr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }
}
NGINX

# Activer le site
ln -sf /etc/nginx/sites-available/cooking-capture /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester et recharger Nginx
nginx -t && systemctl reload nginx

echo "[8/8] Reconstruction et démarrage..."
docker-compose up -d --build

echo ""
echo "========================================"
echo "  MISE À JOUR TERMINÉE !"
echo "========================================"
echo ""
docker-compose ps
echo ""
echo "Le site est accessible sur:"
echo "  - https://coocking-capture.fr"
echo "  - https://www.coocking-capture.fr"
echo ""
