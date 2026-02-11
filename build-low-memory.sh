#!/bin/bash
# Script pour builder avec très peu de mémoire
# À exécuter sur le VPS: bash build-low-memory.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== BUILD OPTIMISÉ POUR FAIBLE MÉMOIRE ==="
echo ""

# Vérifier la mémoire
echo "1. Mémoire disponible:"
free -h
echo ""

# Vérifier le swap
echo "2. Swap disponible:"
swapon --show || echo "⚠️  Pas de swap - créez-en un avec: sudo bash create-swap.sh"
echo ""

# Nettoyer
echo "3. Nettoyage..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
echo "✅ Nettoyage terminé"
echo ""

# Prisma
echo "4. Génération Prisma..."
npx prisma generate || exit 1
echo "✅ Prisma OK"
echo ""

# Builder avec très peu de mémoire et en mode séquentiel
echo "5. Build avec limite mémoire réduite..."
export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Réduire le nombre de workers
export JOBS=1

echo "Lancement du build (peut prendre 10-15 minutes)..."
echo ""

# Lancer avec timeout de 20 minutes
timeout 1200 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Build réussi!"
    if [ -d ".next" ]; then
        echo "✅ Dossier .next créé"
        du -sh .next
    fi
elif [ $BUILD_EXIT -eq 124 ]; then
    echo ""
    echo "❌ Build timeout (20 minutes)"
    echo "   Le VPS est probablement trop lent"
    echo "   Solution: Builder localement et transférer .next"
elif [ $BUILD_EXIT -eq 130 ]; then
    echo ""
    echo "⚠️  Build interrompu par l'utilisateur"
else
    echo ""
    echo "❌ Build échoué (code: $BUILD_EXIT)"
    echo ""
    if grep -qi "killed\|terminated\|out of memory" build.log; then
        echo "⚠️  Problème de mémoire détecté!"
        echo ""
        echo "Solutions:"
        echo "  1. Créer un swap: sudo bash create-swap.sh"
        echo "  2. Builder localement et transférer .next"
        echo "  3. Augmenter la RAM du VPS"
    fi
    echo ""
    echo "Dernières erreurs:"
    tail -100 build.log | grep -i error | tail -20 || tail -50 build.log
fi
