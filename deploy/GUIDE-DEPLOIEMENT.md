# 🍳 Guide de Déploiement - Cooking Capture

## Prérequis

- Un VPS OVH (ou autre) avec Ubuntu 20.04+ ou Debian 11+
- Un nom de domaine pointant vers votre VPS
- Accès root au serveur (SSH)

---

## Méthode 1 : Installation Automatique (Recommandée)

### Étape 1 : Télécharger le script sur votre VPS

```bash
# Connectez-vous à votre VPS
ssh root@VOTRE_IP

# Téléchargez le script de déploiement
curl -o deploy.sh https://raw.githubusercontent.com/VOTRE_REPO/main/deploy/deploy-complete.sh
chmod +x deploy.sh
```

Ou copiez le contenu du fichier `/app/deploy/deploy-complete.sh` directement.

### Étape 2 : Lancer l'installation

```bash
sudo ./deploy.sh --domain coocking-capture.fr --email votre@email.com
```

### Étape 3 : Copier les fichiers de l'application

Depuis votre machine locale ou depuis Emergent :

```bash
# Copier le backend
scp -r /chemin/vers/backend/* root@VOTRE_IP:/opt/cooking-capture/backend/

# Copier le frontend
scp -r /chemin/vers/frontend/* root@VOTRE_IP:/opt/cooking-capture/frontend/
```

**Alternative avec Git :**
Si vous avez sauvegardé sur GitHub via Emergent :
```bash
cd /opt/cooking-capture
git clone https://github.com/VOTRE_USER/VOTRE_REPO.git temp
cp -r temp/backend/* backend/
cp -r temp/frontend/* frontend/
rm -rf temp
```

### Étape 4 : Lancer l'application

```bash
cd /opt/cooking-capture
docker-compose up -d --build
```

### Étape 5 : Activer HTTPS

Après avoir pointé votre DNS vers le serveur (attendre ~5-10 min de propagation) :

```bash
certbot --nginx -d coocking-capture.fr --email votre@email.com --agree-tos -n
```

---

## Méthode 2 : Installation Manuelle

### 1. Mise à jour du système

```bash
apt-get update && apt-get upgrade -y
```

### 2. Installation des dépendances

```bash
apt-get install -y curl git nginx certbot python3-certbot-nginx
```

### 3. Installation de Docker

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```

### 4. Installation de Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 5. Créer la structure

```bash
mkdir -p /opt/cooking-capture/{backend,frontend}
cd /opt/cooking-capture
```

### 6. Créer le fichier .env

```bash
cat > .env << 'EOF'
DOMAIN=coocking-capture.fr
MONGO_USER=cookingadmin
MONGO_PASS=GENEREZ_UN_MOT_DE_PASSE_FORT
JWT_SECRET=GENEREZ_UN_SECRET_JWT_LONG
EMERGENT_LLM_KEY=sk-emergent-4Eb7eEbFf92C80aDeA
RESEND_API_KEY=re_ZBekRpzK_5B9PDAqBmLvJ9pz1GeYTzs9t
SENDER_EMAIL=onboarding@resend.dev
EOF
```

### 7. Créer docker-compose.yml

```yaml
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
```

### 8. Configurer Nginx

```bash
cat > /etc/nginx/sites-available/cooking-capture << 'EOF'
server {
    listen 80;
    server_name coocking-capture.fr;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cooking-capture /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

---

## 🔧 Commandes Utiles

### Gestion des containers

```bash
# Voir l'état
docker-compose ps

# Voir les logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Redémarrer
docker-compose restart

# Arrêter
docker-compose down

# Reconstruire
docker-compose up -d --build
```

### Mise à jour de l'application

```bash
cd /opt/cooking-capture
# Télécharger les nouveaux fichiers
docker-compose down
docker-compose up -d --build
docker image prune -f
```

### Sauvegarde

```bash
# Backup MongoDB
docker exec cooking-mongodb mongodump --archive=/tmp/backup.archive --gzip
docker cp cooking-mongodb:/tmp/backup.archive ./backup_$(date +%Y%m%d).archive

# Backup uploads
docker cp cooking-backend:/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

### Restauration

```bash
# Restaurer MongoDB
docker cp ./backup.archive cooking-mongodb:/tmp/backup.archive
docker exec cooking-mongodb mongorestore --archive=/tmp/backup.archive --gzip
```

---

## 🔐 Configuration Resend (Emails)

Par défaut, Resend est en mode **sandbox**. Pour envoyer des emails à tous :

1. Allez sur [resend.com](https://resend.com)
2. Vérifiez votre domaine
3. Mettez à jour `RESEND_API_KEY` dans `.env`
4. Changez `SENDER_EMAIL` pour `noreply@votre-domaine.fr`

---

## 🐛 Dépannage

### Le site ne charge pas

```bash
# Vérifier que les containers tournent
docker-compose ps

# Voir les logs d'erreur
docker-compose logs backend
docker-compose logs frontend

# Vérifier Nginx
nginx -t
systemctl status nginx
```

### Erreur de connexion MongoDB

```bash
# Vérifier le container MongoDB
docker logs cooking-mongodb

# Se connecter à MongoDB
docker exec -it cooking-mongodb mongosh -u cookingadmin -p VOTRE_MOT_DE_PASSE
```

### Certificat SSL expiré

```bash
certbot renew
```

---

## 📊 Surveillance

### Ressources système

```bash
htop                    # CPU/RAM
df -h                   # Espace disque
docker stats            # Ressources containers
```

### Logs en temps réel

```bash
# Tous les logs
docker-compose logs -f

# Backend uniquement
docker logs -f cooking-backend
```

---

## 📝 Checklist Post-Déploiement

- [ ] DNS configuré (enregistrement A)
- [ ] Application accessible via HTTP
- [ ] HTTPS activé avec Certbot
- [ ] Créer un compte admin
- [ ] Tester l'extraction de recette
- [ ] Tester l'upload d'image
- [ ] Configurer Resend pour la production
- [ ] Mettre en place une sauvegarde automatique

---

**Besoin d'aide ?** Utilisez le formulaire de contact sur l'application ou créez une issue sur GitHub.
