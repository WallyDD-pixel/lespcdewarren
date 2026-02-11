# Guide de déploiement sur VPS avec SCP

## Fichiers à transférer

1. **Schéma Prisma modifié** : `prisma/schema.prisma`
2. **Nouvelle migration** : `prisma/migrations/20251129135805_add_payment_method_to_order/migration.sql`
3. **Package.json** (si modifié) : `package.json`

## Étape 1 : Transférer les fichiers avec SCP

Remplacez `USER@VPS_IP` et `/chemin/vers/votre/projet` par vos valeurs réelles.

```bash
# Transférer le schéma Prisma
scp prisma/schema.prisma USER@VPS_IP:/chemin/vers/votre/projet/prisma/schema.prisma

# Transférer la nouvelle migration (créer le dossier d'abord)
scp -r prisma/migrations/20251129135805_add_payment_method_to_order USER@VPS_IP:/chemin/vers/votre/projet/prisma/migrations/

# Si package.json a été modifié
scp package.json USER@VPS_IP:/chemin/vers/votre/projet/package.json
```

## Étape 2 : Se connecter au VPS

```bash
ssh USER@VPS_IP
cd /chemin/vers/votre/projet
```

## Étape 3 : Appliquer les changements sur le VPS

```bash
# 1. Installer les dépendances si package.json a changé
npm install

# 2. Vérifier que la migration existe
ls -la prisma/migrations/20251129135805_add_payment_method_to_order/

# 3. Appliquer les migrations (si la colonne n'existe pas déjà)
npx prisma migrate deploy

# OU si la colonne existe déjà, marquer la migration comme appliquée
npx prisma migrate resolve --applied 20251129135805_add_payment_method_to_order

# 4. Régénérer le client Prisma
npx prisma generate

# 5. Rebuild l'application
npm run build

# 6. Redémarrer l'application (selon votre setup)
# Si vous utilisez PM2:
pm2 restart lespcdewarren

# Si vous utilisez systemd:
sudo systemctl restart lespcdewarren

# Si vous utilisez directement:
# Arrêtez le processus actuel (Ctrl+C) puis:
npm start
```

## Vérification rapide

```bash
# Vérifier que la colonne existe dans la base de données
sqlite3 prisma/prod.db "PRAGMA table_info(Order);" | grep paymentMethod
```

## Commandes SCP complètes (copier-coller)

```bash
# Configuration pour votre VPS
VPS_USER="root"  # Modifiez si vous utilisez un autre utilisateur
VPS_IP="51.38.236.183"
VPS_PATH="/var/www/lespcdewarren/lespcdewarren"

# Transférer le schéma
scp prisma/schema.prisma ${VPS_USER}@${VPS_IP}:${VPS_PATH}/prisma/schema.prisma

# Transférer la migration
scp -r prisma/migrations/20251129135805_add_payment_method_to_order ${VPS_USER}@${VPS_IP}:${VPS_PATH}/prisma/migrations/

# Transférer package.json (si modifié)
scp package.json ${VPS_USER}@${VPS_IP}:${VPS_PATH}/package.json
```

## Script de déploiement rapide (optionnel)

Créez un fichier `deploy.sh` sur votre machine locale :

```bash
#!/bin/bash
VPS_USER="root"  # Modifiez si nécessaire
VPS_IP="51.38.236.183"
VPS_PATH="/var/www/lespcdewarren/lespcdewarren"

echo "📤 Transfert des fichiers..."
scp prisma/schema.prisma ${VPS_USER}@${VPS_IP}:${VPS_PATH}/prisma/schema.prisma
scp -r prisma/migrations/20251129135805_add_payment_method_to_order ${VPS_USER}@${VPS_IP}:${VPS_PATH}/prisma/migrations/
scp package.json ${VPS_USER}@${VPS_IP}:${VPS_PATH}/package.json

echo "🔧 Application des changements sur le VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
cd /var/www/lespcdewarren/lespcdewarren
npm install
npx prisma migrate resolve --applied 20251129135805_add_payment_method_to_order || npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart lespcdewarren || systemctl restart lespcdewarren || echo "Redémarrez manuellement l'application"
EOF

echo "✅ Déploiement terminé!"
```

Rendez-le exécutable : `chmod +x deploy.sh`
Puis exécutez : `./deploy.sh`

