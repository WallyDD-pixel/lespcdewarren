#!/bin/bash

# Script de déploiement pour VPS
# Usage: ./deploy.sh [user@host] [path]

# Configuration par défaut (modifiez selon votre setup)
VPS_USER_HOST="${1:-ubuntu@51.38.236.183}"
VPS_PATH="${2:-/var/www/lespcdewarren/lespcdewarren}"

echo "🚀 Déploiement sur VPS..."
echo "   Serveur: $VPS_USER_HOST"
echo "   Chemin: $VPS_PATH"
echo ""

# Vérifier que les fichiers existent
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Erreur: prisma/schema.prisma introuvable"
    exit 1
fi

if [ ! -d "prisma/migrations/20251129135805_add_payment_method_to_order" ]; then
    echo "❌ Erreur: Migration introuvable"
    exit 1
fi

echo "📤 Transfert des fichiers..."
scp prisma/schema.prisma ${VPS_USER_HOST}:${VPS_PATH}/prisma/schema.prisma
scp -r prisma/migrations/20251129135805_add_payment_method_to_order ${VPS_USER_HOST}:${VPS_PATH}/prisma/migrations/
scp package.json ${VPS_USER_HOST}:${VPS_PATH}/package.json

echo ""
echo "🔧 Application des changements sur le VPS..."
ssh ${VPS_USER_HOST} << EOF
set -e
cd ${VPS_PATH}
echo "📦 Installation des dépendances..."
npm install
echo "🗄️  Application des migrations..."
npx prisma migrate resolve --applied 20251129135805_add_payment_method_to_order 2>/dev/null || npx prisma migrate deploy
echo "⚙️  Génération du client Prisma..."
npx prisma generate
echo "🏗️  Build de l'application..."
npm run build
echo "🔄 Redémarrage de l'application..."
pm2 restart lespcdewarren 2>/dev/null || systemctl restart lespcdewarren 2>/dev/null || echo "⚠️  Redémarrez manuellement l'application"
EOF

echo ""
echo "✅ Déploiement terminé!"

