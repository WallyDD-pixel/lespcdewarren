#!/bin/bash
# Script pour builder l'application en production sur EC2

set -e

echo "=== BUILD PRODUCTION EC2 ==="
echo ""

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé"
    exit 1
fi

echo "1. Arrêt de PM2..."
pm2 stop lespcdewarren 2>/dev/null || echo "PM2 déjà arrêté"
echo ""

echo "2. Récupération des dernières modifications..."
git pull --no-rebase || git reset --hard origin/main
echo ""

echo "3. Nettoyage des anciens builds..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
echo "✅ Nettoyage terminé"
echo ""

echo "4. Vérification de la mémoire..."
free -h
echo ""

echo "5. Installation des dépendances si nécessaire..."
npm install
echo ""

echo "6. Application des migrations Prisma..."
npx prisma migrate deploy || echo "⚠️  Aucune migration à appliquer"
npx prisma generate
echo ""

echo "7. Build avec limite mémoire et ESLint désactivé..."
export NODE_OPTIONS="--max-old-space-size=1024"
export ESLINT_NO_DEV_ERRORS=true
export NEXT_TELEMETRY_DISABLED=1

echo "Lancement du build (peut prendre 10-20 minutes)..."
echo ""

# Timeout de 30 minutes
timeout 1800 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo "✅✅✅ BUILD RÉUSSI! ✅✅✅"
    if [ -d ".next" ]; then
        echo "✅ Dossier .next créé"
        du -sh .next
        echo ""
        echo "8. Redémarrage de PM2..."
        pm2 restart lespcdewarren
        sleep 3
        pm2 logs lespcdewarren --lines 20 --nostream
    else
        echo "❌ Dossier .next non trouvé malgré le succès du build"
    fi
elif [ $BUILD_EXIT -eq 124 ]; then
    echo ""
    echo "❌ Build timeout (30 minutes)"
    echo "   Le serveur est trop lent ou manque de ressources"
    echo ""
    echo "Solution recommandée: Builder localement et transférer"
else
    echo ""
    echo "❌ Build échoué (code: $BUILD_EXIT)"
    echo ""
    echo "Dernières erreurs:"
    tail -50 build.log
    echo ""
    echo "Vérifiez les erreurs ci-dessus et corrigez-les"
fi

