#!/bin/bash
# Script pour nettoyer complètement et rebuilder l'application sur EC2

set -e

echo "🛑 Arrêt de PM2..."
pm2 stop all || true
pm2 delete all || true

echo "📥 Récupération des changements Git..."
git pull

echo "🧹 Nettoyage complet de l'ancien build..."
rm -rf .next
rm -rf node_modules/.cache

echo "🔨 Rebuild avec la nouvelle configuration..."
export NODE_OPTIONS="--max-old-space-size=1024"
export ESLINT_NO_DEV_ERRORS=true
npm run build 2>&1 | tee build.log

echo "✅ Vérification du build..."
if grep -qi "error\|failed" build.log; then
    echo "❌ Erreurs détectées dans le build :"
    tail -50 build.log | grep -i "error\|failed"
    exit 1
fi

echo "🚀 Démarrage de PM2..."
pm2 start npm --name lespcdewarren -- start

echo "⏳ Attente de 5 secondes..."
sleep 5

echo "📋 Vérification des logs PM2..."
pm2 logs lespcdewarren --lines 30 --nostream

echo "✅ Rebuild terminé !"
pm2 status

