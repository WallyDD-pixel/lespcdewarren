#!/bin/bash
# Script de diagnostic pour le VPS
# À exécuter sur le VPS: bash diagnose-vps.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== DIAGNOSTIC DU SITE ==="
echo ""

echo "1. Vérification de l'état PM2..."
pm2 list
echo ""

echo "2. Vérification des logs PM2 (dernières 30 lignes)..."
pm2 logs lespcdewarren --lines 30 --nostream 2>/dev/null || echo "⚠️  Aucun log PM2 trouvé"
echo ""

echo "3. Vérification que le build existe..."
if [ -d ".next" ]; then
    echo "✅ Dossier .next existe"
    ls -la .next | head -5
else
    echo "❌ Dossier .next n'existe pas - le build n'a pas été fait"
fi
echo ""

echo "4. Vérification du fichier .env..."
if [ -f ".env" ]; then
    echo "✅ Fichier .env existe"
    echo "Variables importantes:"
    grep -E "DATABASE_URL|NODE_ENV|PORT" .env | sed 's/=.*/=***/' || echo "Variables non trouvées"
else
    echo "❌ Fichier .env n'existe pas"
fi
echo ""

echo "5. Vérification du port 3001..."
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Port 3001 est utilisé par:"
    lsof -i :3001
else
    echo "❌ Port 3001 n'est pas utilisé - l'application n'est pas démarrée"
fi
echo ""

echo "6. Vérification de la base de données..."
if [ -f "prisma/prod.db" ]; then
    echo "✅ Base de données existe"
    sqlite3 prisma/prod.db "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table';" 2>/dev/null && echo "Tables accessibles" || echo "⚠️  Problème d'accès à la base"
else
    echo "❌ Base de données prod.db n'existe pas"
fi
echo ""

echo "7. Vérification de nginx..."
if command -v nginx > /dev/null 2>&1; then
    echo "État de nginx:"
    sudo systemctl status nginx --no-pager -l | head -10 || echo "⚠️  Impossible de vérifier nginx"
else
    echo "⚠️  nginx n'est pas installé"
fi
echo ""

echo "=== ACTIONS RECOMMANDÉES ==="
echo ""
echo "Si PM2 n'est pas démarré, exécutez:"
echo "  pm2 start npm --name lespcdewarren -- start"
echo ""
echo "Si le build n'existe pas, exécutez:"
echo "  npm run build"
echo ""
echo "Pour voir les logs en temps réel:"
echo "  pm2 logs lespcdewarren"
echo ""
echo "Pour redémarrer:"
echo "  pm2 restart lespcdewarren"
echo ""
