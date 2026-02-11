# Guide pour lancer le backend sur le VPS

## Commandes à exécuter sur le VPS

Vous êtes actuellement dans : `/var/www/lespcdewarren/lespcdewarren`

### Option 1 : Si l'application est déjà buildée

```bash
# Vérifier si le dossier .next existe
ls -la .next

# Si .next existe, lancer directement avec PM2
pm2 start npm --name lespcdewarren -- start

# Vérifier que l'application est lancée
pm2 list

# Voir les logs en temps réel
pm2 logs lespcdewarren
```

### Option 2 : Si vous devez faire le build d'abord

```bash
# 1. Installer les dépendances (si nécessaire)
npm install

# 2. Générer le client Prisma
npx prisma generate

# 3. Build l'application Next.js
npm run build

# 4. Lancer avec PM2
pm2 start npm --name lespcdewarren -- start

# 5. Vérifier le statut
pm2 list

# 6. Voir les logs
pm2 logs lespcdewarren
```

### Option 3 : Configuration PM2 avec fichier ecosystem (recommandé)

Créez un fichier `ecosystem.config.js` dans le répertoire du projet :

```javascript
module.exports = {
  apps: [{
    name: 'lespcdewarren',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/lespcdewarren/lespcdewarren',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Puis lancez avec :
```bash
pm2 start ecosystem.config.js
pm2 save  # Pour sauvegarder la configuration
pm2 startup  # Pour lancer PM2 au démarrage du serveur
```

## Commandes PM2 utiles

```bash
# Voir tous les processus
pm2 list

# Voir les logs
pm2 logs lespcdewarren

# Redémarrer l'application
pm2 restart lespcdewarren

# Arrêter l'application
pm2 stop lespcdewarren

# Supprimer l'application de PM2
pm2 delete lespcdewarren

# Voir les informations détaillées
pm2 show lespcdewarren

# Surveiller (CPU, mémoire)
pm2 monit
```

## Variables d'environnement importantes

Assurez-vous d'avoir un fichier `.env` avec au minimum :
- `NODE_ENV=production`
- `SESSION_SECRET` (une chaîne aléatoire de 32+ caractères)
- `DATABASE_URL` (pour Prisma)
- Variables SMTP si vous utilisez l'envoi d'emails

## Vérification que le backend fonctionne

```bash
# Vérifier que le processus tourne
pm2 list

# Vérifier les logs pour voir s'il y a des erreurs
pm2 logs lespcdewarren --lines 50

# Tester depuis le VPS
curl http://localhost:3000
```

## Dépannage

Si l'application ne démarre pas :

1. **Vérifier les logs** : `pm2 logs lespcdewarren --err`
2. **Vérifier que le port 3000 est disponible** : `netstat -tulpn | grep 3000`
3. **Vérifier les variables d'environnement** : `pm2 show lespcdewarren`
4. **Rebuild si nécessaire** : `rm -rf .next && npm run build`




