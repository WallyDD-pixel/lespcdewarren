#!/bin/bash
# Script rapide pour corriger le problème de build
# À exécuter sur le VPS: bash quick-fix-build.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== CORRECTION RAPIDE DU BUILD ==="
echo ""

# 1. Vérifier la mémoire
echo "1. Mémoire disponible:"
free -h
echo ""

# 2. Créer un swap si nécessaire
if ! swapon --show | grep -q .; then
    echo "2. Création d'un swap file de 2GB..."
    sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "✅ Swap créé et activé"
    free -h
else
    echo "2. Swap déjà actif:"
    swapon --show
fi
echo ""

# 3. Nettoyer complètement
echo "3. Nettoyage complet..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf tsconfig.tsbuildinfo
echo "✅ Nettoyage terminé"
echo ""

# 4. Prisma
echo "4. Génération Prisma..."
npx prisma generate || exit 1
echo "✅ Prisma OK"
echo ""

# 5. Builder avec très peu de mémoire
echo "5. Build avec limite mémoire réduite (1GB)..."
export NODE_OPTIONS="--max-old-space-size=1024"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "Lancement du build (peut prendre 10-15 minutes)..."
echo "Si le build se bloque encore, le VPS n'a probablement pas assez de RAM"
echo ""

# Lancer avec timeout de 20 minutes
timeout 1200 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

echo ""
if [ $BUILD_EXIT -eq 0 ]; then
    if [ -d ".next" ]; then
        echo "✅✅✅ BUILD RÉUSSI! ✅✅✅"
        echo ""
        echo "Taille du build:"
        du -sh .next
        echo ""
        echo "Pour démarrer l'application:"
        echo "  pm2 start npm --name lespcdewarren -- start"
    else
        echo "⚠️  Build terminé mais .next n'existe pas"
    fi
elif [ $BUILD_EXIT -eq 124 ]; then
    echo "❌ Build timeout (20 minutes)"
    echo "   Le VPS est trop lent ou manque de ressources"
elif [ $BUILD_EXIT -eq 130 ]; then
    echo "⚠️  Build interrompu"
else
    echo "❌ Build échoué (code: $BUILD_EXIT)"
    echo ""
    if grep -qi "killed\|terminated\|out of memory" build.log; then
        echo "⚠️  PROBLÈME DE MÉMOIRE DÉTECTÉ!"
        echo ""
        echo "Solutions:"
        echo "  1. Augmenter la RAM du VPS"
        echo "  2. Builder localement et transférer .next (voir build-local-transfer.sh)"
        echo "  3. Vérifier que le swap est bien utilisé: free -h"
    fi
    echo ""
    echo "Dernières erreurs:"
    tail -50 build.log | grep -i error || tail -30 build.log
fi
