#!/bin/bash
# Script pour arrêter PM2, builder, et redémarrer seulement si le build réussit

set -e

echo "=== ARRÊT PM2 ET BUILD ==="
echo ""

# 1. Arrêter PM2 pour éviter les redémarrages en boucle
echo "1. Arrêt de PM2..."
pm2 stop lespcdewarren 2>/dev/null || echo "PM2 déjà arrêté"
pm2 delete lespcdewarren 2>/dev/null || echo "PM2 process déjà supprimé"
echo "✅ PM2 arrêté"
echo ""

# 2. Récupérer les dernières modifications
echo "2. Récupération des modifications..."
git pull --no-rebase || git reset --hard origin/main
echo ""

# 3. Vérifier que le polyfill est présent
if [ ! -f "next-server-polyfill.js" ]; then
    echo "❌ Erreur: next-server-polyfill.js non trouvé"
    exit 1
fi
echo "✅ Polyfill présent"
echo ""

# 4. Nettoyer
echo "3. Nettoyage..."
rm -rf .next node_modules/.cache .turbo
echo "✅ Nettoyage terminé"
echo ""

# 5. Vérifier la mémoire
echo "4. Mémoire disponible:"
free -h
echo ""

# 6. Installer les dépendances
echo "5. Installation des dépendances..."
npm install
echo ""

# 7. Migrations Prisma
echo "6. Migrations Prisma..."
npx prisma migrate deploy || echo "⚠️  Aucune migration à appliquer"
npx prisma generate
echo ""

# 8. Builder
echo "7. Build de l'application..."
export NODE_OPTIONS="--max-old-space-size=1024"
export ESLINT_NO_DEV_ERRORS=true
export NEXT_TELEMETRY_DISABLED=1

echo "Lancement du build (peut prendre 10-20 minutes)..."
echo ""

# Timeout de 30 minutes
timeout 1800 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ] && [ -d ".next" ]; then
    echo ""
    echo "✅✅✅ BUILD RÉUSSI! ✅✅✅"
    du -sh .next
    echo ""
    
    # Vérifier que BUILD_ID existe
    if [ -f ".next/BUILD_ID" ]; then
        echo "✅ BUILD_ID trouvé"
        cat .next/BUILD_ID
    else
        echo "⚠️  BUILD_ID non trouvé, mais dossier .next existe"
    fi
    echo ""
    
    echo "8. Redémarrage de PM2..."
    pm2 start npm --name lespcdewarren -- start
    sleep 5
    pm2 logs lespcdewarren --lines 30 --nostream
    echo ""
    echo "✅ Application démarrée!"
else
    echo ""
    echo "❌ BUILD ÉCHOUÉ (code: $BUILD_EXIT)"
    echo ""
    if [ $BUILD_EXIT -eq 124 ]; then
        echo "⚠️  Timeout (30 minutes)"
    fi
    echo ""
    echo "Dernières erreurs du build:"
    tail -100 build.log | grep -A 20 -i "error\|fail\|document" || tail -50 build.log
    echo ""
    echo "PM2 reste arrêté jusqu'à ce que le build réussisse"
    exit 1
fi

