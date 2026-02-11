#!/bin/bash
# Script de démarrage rapide
# À exécuter sur le VPS: bash quick-start.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== DÉMARRAGE RAPIDE ==="
echo ""

# Vérifier PM2
if ! command -v pm2 > /dev/null 2>&1; then
    echo "Installation de PM2..."
    sudo npm install -g pm2
fi

# Vérifier le build
if [ ! -d ".next" ]; then
    echo "❌ Dossier .next manquant!"
    echo "   Transférez-le depuis votre machine locale avec:"
    echo "   .\transfer-build.ps1"
    exit 1
fi

# Arrêter les anciens processus
pm2 delete lespcdewarren 2>/dev/null || true

# Démarrer
echo "Démarrage de l'application..."
pm2 start npm --name lespcdewarren -- start

sleep 2

pm2 list
pm2 logs lespcdewarren --lines 10 --nostream

echo ""
echo "✅ Application démarrée!"
echo "   Pour voir les logs: pm2 logs lespcdewarren"
