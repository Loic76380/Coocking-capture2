# Guide de Déploiement VPS
## Application Cooking Capture

---

# GUIDE COMPLET DE DÉPLOIEMENT
## Cooking Capture sur Serveur Privé (VPS)

**Version:** 1.0  
**Date:** Janvier 2025  
**Niveau:** Débutant

---

## TABLE DES MATIÈRES

1. Prérequis
2. Connexion au serveur
3. Préparation du serveur
4. Structure des répertoires
5. Installation de MongoDB
6. Installation de Node.js
7. Installation de Python
8. Déploiement du Backend
9. Déploiement du Frontend
10. Configuration de Nginx
11. Sécurisation avec SSL (HTTPS)
12. Configuration du démarrage automatique
13. Maintenance et mises à jour
14. Dépannage

---

## 1. PRÉREQUIS

### 1.1 Ce dont vous avez besoin

- **Un serveur VPS** avec :
  - Système : Ubuntu 22.04 LTS (recommandé)
  - RAM : minimum 2 Go
  - Stockage : minimum 20 Go
  - Processeur : 1 vCPU minimum

- **Un nom de domaine** : cooking-capture.fr (ou autre)

- **Accès SSH** au serveur (identifiants fournis par votre hébergeur)

- **Le code source** de l'application (exporté depuis GitHub)

### 1.2 Hébergeurs VPS recommandés

| Hébergeur | Prix mensuel | Lien |
|-----------|--------------|------|
| OVH | ~5€ | ovh.com |
| Scaleway | ~4€ | scaleway.com |
| DigitalOcean | ~6$ | digitalocean.com |
| Hetzner | ~4€ | hetzner.com |

### 1.3 Outils à installer sur votre ordinateur

**Windows :**
- Téléchargez PuTTY : https://putty.org
- Ou utilisez Windows Terminal (Windows 10/11)

**Mac / Linux :**
- Le terminal intégré suffit

---

## 2. CONNEXION AU SERVEUR

### 2.1 Première connexion SSH

Ouvrez votre terminal et tapez :

```bash
ssh root@ADRESSE_IP_DU_SERVEUR
```

Remplacez `ADRESSE_IP_DU_SERVEUR` par l'IP fournie par votre hébergeur.

**Exemple :**
```bash
ssh root@91.234.56.78
```

Tapez `yes` si demandé, puis entrez votre mot de passe.

### 2.2 Créer un utilisateur dédié (sécurité)

```bash
# Créer un nouvel utilisateur
adduser deploy

# Lui donner les droits administrateur
usermod -aG sudo deploy

# Se connecter avec ce nouvel utilisateur
su - deploy
```

À partir de maintenant, utilisez l'utilisateur `deploy`.

---

## 3. PRÉPARATION DU SERVEUR

### 3.1 Mettre à jour le système

```bash
sudo apt update
sudo apt upgrade -y
```

**Explication :** Cette commande télécharge et installe les dernières mises à jour de sécurité.

### 3.2 Installer les outils de base

```bash
sudo apt install -y curl wget git build-essential software-properties-common
```

### 3.3 Configurer le pare-feu

```bash
# Activer le pare-feu
sudo ufw enable

# Autoriser SSH (important !)
sudo ufw allow ssh

# Autoriser HTTP et HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Vérifier le statut
sudo ufw status
```

---

## 4. STRUCTURE DES RÉPERTOIRES

### 4.1 Créer l'arborescence

```bash
# Créer le répertoire principal pour toutes les applications
sudo mkdir -p /var/www

# Créer le répertoire pour Cooking Capture
sudo mkdir -p /var/www/cooking-capture.fr

# Créer le répertoire pour vos futures applications
sudo mkdir -p /var/www/autres-applications

# Donner les droits à l'utilisateur deploy
sudo chown -R deploy:deploy /var/www/cooking-capture.fr
sudo chown -R deploy:deploy /var/www/autres-applications
```

### 4.2 Structure finale

```
/var/www/
├── cooking-capture.fr/
│   ├── backend/          ← API Python/FastAPI
│   ├── frontend/         ← Interface React
│   └── logs/             ← Fichiers de logs
│
└── autres-applications/
    ├── app1/
    ├── app2/
    └── ...
```

### 4.3 Créer les sous-répertoires

```bash
cd /var/www/cooking-capture.fr
mkdir -p backend frontend logs
```

---

## 5. INSTALLATION DE MONGODB

### 5.1 Ajouter le dépôt MongoDB

```bash
# Importer la clé GPG
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Ajouter le dépôt
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Mettre à jour la liste des paquets
sudo apt update
```

### 5.2 Installer MongoDB

```bash
sudo apt install -y mongodb-org
```

### 5.3 Démarrer MongoDB

```bash
# Démarrer le service
sudo systemctl start mongod

# Activer le démarrage automatique
sudo systemctl enable mongod

# Vérifier le statut
sudo systemctl status mongod
```

Vous devriez voir `active (running)` en vert.

### 5.4 Sécuriser MongoDB

```bash
# Se connecter à MongoDB
mongosh

# Dans le shell MongoDB, créer un administrateur
use admin
db.createUser({
  user: "admin",
  pwd: "VotreMotDePasseSecurise123!",
  roles: ["root"]
})

# Créer un utilisateur pour l'application
use cooking_capture
db.createUser({
  user: "cooking_user",
  pwd: "MotDePasseApplication456!",
  roles: ["readWrite"]
})

# Quitter
exit
```

**IMPORTANT :** Notez ces mots de passe, vous en aurez besoin !

### 5.5 Activer l'authentification

```bash
sudo nano /etc/mongod.conf
```

Trouvez la section `#security:` et modifiez-la :

```yaml
security:
  authorization: enabled
```

Redémarrez MongoDB :

```bash
sudo systemctl restart mongod
```

---

## 6. INSTALLATION DE NODE.JS

### 6.1 Installer Node.js 20 LTS

```bash
# Ajouter le dépôt NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### 6.2 Installer Yarn

```bash
sudo npm install -g yarn

# Vérifier
yarn --version
```

---

## 7. INSTALLATION DE PYTHON

### 7.1 Installer Python 3.11

```bash
# Ajouter le dépôt
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update

# Installer Python
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Vérifier
python3.11 --version
```

---

## 8. DÉPLOIEMENT DU BACKEND

### 8.1 Transférer les fichiers

**Option A : Depuis GitHub**

```bash
cd /var/www/cooking-capture.fr
git clone https://github.com/VOTRE_UTILISATEUR/cooking-capture.git temp
mv temp/backend/* backend/
rm -rf temp
```

**Option B : Depuis votre ordinateur (avec SCP)**

Sur votre ordinateur local :
```bash
scp -r ./backend/* deploy@ADRESSE_IP:/var/www/cooking-capture.fr/backend/
```

### 8.2 Créer l'environnement virtuel Python

```bash
cd /var/www/cooking-capture.fr/backend

# Créer l'environnement virtuel
python3.11 -m venv venv

# Activer l'environnement
source venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt
```

### 8.3 Configurer les variables d'environnement

```bash
nano /var/www/cooking-capture.fr/backend/.env
```

Contenu du fichier :

```env
MONGO_URL=mongodb://cooking_user:MotDePasseApplication456!@localhost:27017/cooking_capture?authSource=cooking_capture
DB_NAME=cooking_capture
CORS_ORIGINS=https://cooking-capture.fr,https://www.cooking-capture.fr
EMERGENT_LLM_KEY=sk-emergent-VOTRE_CLE_ICI
RESEND_API_KEY=re_VOTRE_CLE_RESEND
SENDER_EMAIL=noreply@cooking-capture.fr
JWT_SECRET=votre-secret-jwt-tres-long-et-securise-minimum-32-caracteres
```

**IMPORTANT :** Remplacez les valeurs par vos vraies clés !

### 8.4 Tester le backend

```bash
cd /var/www/cooking-capture.fr/backend
source venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

Ouvrez un nouveau terminal et testez :
```bash
curl http://127.0.0.1:8001/api/
```

Vous devriez voir : `{"message":"Cooking Capture API"}`

Appuyez sur `Ctrl+C` pour arrêter.

---

## 9. DÉPLOIEMENT DU FRONTEND

### 9.1 Transférer les fichiers

```bash
cd /var/www/cooking-capture.fr

# Si depuis GitHub (même repo)
git clone https://github.com/VOTRE_UTILISATEUR/cooking-capture.git temp
mv temp/frontend/* frontend/
rm -rf temp
```

### 9.2 Configurer les variables d'environnement

```bash
nano /var/www/cooking-capture.fr/frontend/.env
```

Contenu :

```env
REACT_APP_BACKEND_URL=https://cooking-capture.fr
```

### 9.3 Installer les dépendances et compiler

```bash
cd /var/www/cooking-capture.fr/frontend

# Installer les dépendances
yarn install

# Compiler pour la production
yarn build
```

Cette commande crée un dossier `build/` contenant les fichiers optimisés.

---

## 10. CONFIGURATION DE NGINX

### 10.1 Installer Nginx

```bash
sudo apt install -y nginx
```

### 10.2 Créer la configuration du site

```bash
sudo nano /etc/nginx/sites-available/cooking-capture.fr
```

Copiez ce contenu :

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name cooking-capture.fr www.cooking-capture.fr;
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name cooking-capture.fr www.cooking-capture.fr;

    # Logs
    access_log /var/www/cooking-capture.fr/logs/access.log;
    error_log /var/www/cooking-capture.fr/logs/error.log;

    # SSL (sera configuré par Certbot)
    ssl_certificate /etc/letsencrypt/live/cooking-capture.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cooking-capture.fr/privkey.pem;

    # Sécurité SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Frontend (fichiers statiques React)
    root /var/www/cooking-capture.fr/frontend/build;
    index index.html;

    # Gestion des routes React (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend (proxy vers FastAPI)
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Cache des fichiers statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 10.3 Activer le site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/cooking-capture.fr /etc/nginx/sites-enabled/

# Supprimer le site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

---

## 11. SÉCURISATION AVEC SSL (HTTPS)

### 11.1 Installer Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Obtenir le certificat SSL

**AVANT cette étape :** Assurez-vous que votre domaine pointe vers l'IP de votre serveur !

```bash
sudo certbot --nginx -d cooking-capture.fr -d www.cooking-capture.fr
```

Suivez les instructions :
1. Entrez votre email
2. Acceptez les conditions (A)
3. Choisissez si vous voulez partager votre email (N)

### 11.3 Renouvellement automatique

```bash
# Tester le renouvellement
sudo certbot renew --dry-run
```

Le renouvellement est automatique (cron job installé par Certbot).

---

## 12. CONFIGURATION DU DÉMARRAGE AUTOMATIQUE

### 12.1 Créer le service Backend

```bash
sudo nano /etc/systemd/system/cooking-capture-backend.service
```

Contenu :

```ini
[Unit]
Description=Cooking Capture Backend API
After=network.target mongod.service

[Service]
User=deploy
Group=deploy
WorkingDirectory=/var/www/cooking-capture.fr/backend
Environment="PATH=/var/www/cooking-capture.fr/backend/venv/bin"
ExecStart=/var/www/cooking-capture.fr/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 12.2 Activer et démarrer le service

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Activer le démarrage automatique
sudo systemctl enable cooking-capture-backend

# Démarrer le service
sudo systemctl start cooking-capture-backend

# Vérifier le statut
sudo systemctl status cooking-capture-backend
```

### 12.3 Commandes utiles

```bash
# Voir les logs en temps réel
sudo journalctl -u cooking-capture-backend -f

# Redémarrer le backend
sudo systemctl restart cooking-capture-backend

# Arrêter le backend
sudo systemctl stop cooking-capture-backend
```

---

## 13. MAINTENANCE ET MISES À JOUR

### 13.1 Mettre à jour l'application

```bash
# Se connecter au serveur
ssh deploy@ADRESSE_IP

# Aller dans le répertoire
cd /var/www/cooking-capture.fr

# Télécharger les mises à jour (si Git)
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart cooking-capture-backend

# Frontend
cd ../frontend
yarn install
yarn build
```

### 13.2 Sauvegarder la base de données

```bash
# Créer une sauvegarde
mongodump --uri="mongodb://cooking_user:MotDePasseApplication456!@localhost:27017/cooking_capture?authSource=cooking_capture" --out=/var/www/cooking-capture.fr/backups/$(date +%Y%m%d)

# Restaurer une sauvegarde
mongorestore --uri="mongodb://cooking_user:MotDePasseApplication456!@localhost:27017/cooking_capture?authSource=cooking_capture" /var/www/cooking-capture.fr/backups/20250104/
```

### 13.3 Script de sauvegarde automatique

```bash
nano /var/www/cooking-capture.fr/backup.sh
```

Contenu :

```bash
#!/bin/bash
BACKUP_DIR="/var/www/cooking-capture.fr/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://cooking_user:MotDePasseApplication456!@localhost:27017/cooking_capture?authSource=cooking_capture" --out=$BACKUP_DIR/$DATE

# Garder seulement les 7 dernières sauvegardes
cd $BACKUP_DIR && ls -t | tail -n +8 | xargs -r rm -rf
```

```bash
chmod +x /var/www/cooking-capture.fr/backup.sh
```

Ajouter au cron (sauvegarde quotidienne à 3h du matin) :

```bash
crontab -e
```

Ajouter cette ligne :

```
0 3 * * * /var/www/cooking-capture.fr/backup.sh
```

---

## 14. DÉPANNAGE

### 14.1 Le site ne s'affiche pas

```bash
# Vérifier Nginx
sudo systemctl status nginx
sudo nginx -t

# Vérifier les logs
sudo tail -f /var/log/nginx/error.log
tail -f /var/www/cooking-capture.fr/logs/error.log
```

### 14.2 L'API ne répond pas

```bash
# Vérifier le backend
sudo systemctl status cooking-capture-backend

# Voir les logs
sudo journalctl -u cooking-capture-backend -n 50

# Tester manuellement
curl http://127.0.0.1:8001/api/
```

### 14.3 Erreur de base de données

```bash
# Vérifier MongoDB
sudo systemctl status mongod

# Tester la connexion
mongosh "mongodb://cooking_user:MotDePasseApplication456!@localhost:27017/cooking_capture?authSource=cooking_capture"
```

### 14.4 Problème de certificat SSL

```bash
# Renouveler manuellement
sudo certbot renew

# Vérifier les certificats
sudo certbot certificates
```

### 14.5 Commandes utiles de diagnostic

```bash
# Espace disque
df -h

# Mémoire
free -m

# Processus
htop

# Ports ouverts
sudo netstat -tlnp

# Logs système
sudo tail -f /var/log/syslog
```

---

## RÉCAPITULATIF DES COMMANDES PRINCIPALES

| Action | Commande |
|--------|----------|
| Démarrer le backend | `sudo systemctl start cooking-capture-backend` |
| Arrêter le backend | `sudo systemctl stop cooking-capture-backend` |
| Redémarrer le backend | `sudo systemctl restart cooking-capture-backend` |
| Voir logs backend | `sudo journalctl -u cooking-capture-backend -f` |
| Redémarrer Nginx | `sudo systemctl restart nginx` |
| Redémarrer MongoDB | `sudo systemctl restart mongod` |
| Recompiler le frontend | `cd /var/www/cooking-capture.fr/frontend && yarn build` |
| Sauvegarder la BDD | `/var/www/cooking-capture.fr/backup.sh` |

---

## CHECKLIST DE DÉPLOIEMENT

- [ ] Serveur VPS commandé et accessible
- [ ] Nom de domaine acheté et pointé vers l'IP
- [ ] Utilisateur `deploy` créé
- [ ] Pare-feu configuré
- [ ] MongoDB installé et sécurisé
- [ ] Node.js et Yarn installés
- [ ] Python 3.11 installé
- [ ] Backend déployé et testé
- [ ] Frontend compilé
- [ ] Nginx configuré
- [ ] Certificat SSL obtenu
- [ ] Service backend en démarrage automatique
- [ ] Sauvegarde automatique configurée

---

**Félicitations !** 🎉

Votre application Cooking Capture est maintenant déployée sur votre serveur privé.

**Accès :** https://cooking-capture.fr

---

*Guide créé pour Cooking Capture - Janvier 2025*
