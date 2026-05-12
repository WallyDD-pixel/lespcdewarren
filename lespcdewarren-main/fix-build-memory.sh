#!/bin/bash
# Script pour corriger les problèmes de mémoire lors du build
# À exécuter sur le VPS: bash fix-build-memory.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== DIAGNOSTIC MÉMOIRE ==="
echo ""

# Vérifier la mémoire disponible
echo "1. Mémoire disponible:"
free -h
echo ""

# Vérifier la mémoire utilisée par les processus
echo "2. Top processus consommateurs de mémoire:"
ps aux --sort=-%mem | head -10
echo ""

# Vérifier les limites système
echo "3. Limites système:"
ulimit -a
echo ""

echo "=== OPTIMISATION DU BUILD ==="
echo ""

# Nettoyer complètement
echo "4. Nettoyage complet..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf tsconfig.tsbuildinfo
echo "✅ Nettoyage terminé"
echo ""

# Vérifier Prisma
echo "5. Vérification Prisma..."
npx prisma generate
echo "✅ Prisma OK"
echo ""

# Créer un fichier de swap temporaire si nécessaire
echo "6. Vérification du swap..."
SWAP_SIZE=$(free | grep Swap | awk '{print $2}')
if [ "$SWAP_SIZE" -eq 0 ]; then
    echo "⚠️  Pas de swap détecté"
    echo "   Création d'un swap temporaire de 2GB..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1024 count=2097152
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "✅ Swap activé"
else
    echo "✅ Swap disponible: $(free -h | grep Swap | awk '{print $2}')"
fi
echo ""

# Lancer le build avec moins de mémoire et en mode séquentiel
echo "7. Lancement du build optimisé..."
echo "   Mode: séquentiel avec limite mémoire réduite"
echo ""

# Réduire la limite de mémoire pour éviter le kill
export NODE_OPTIONS="--max-old-space-size=2048"
export NODE_ENV=production

# Lancer le build avec timeout et en arrière-plan pour pouvoir monitorer
echo "Build en cours (peut prendre 5-10 minutes)..."
timeout 900 npm run build 2>&1 | tee build.log &
BUILD_PID=$!

# Monitorer la mémoire pendant le build
echo "Monitoring PID: $BUILD_PID"
while kill -0 $BUILD_PID 2>/dev/null; do
    sleep 5
    MEM_USAGE=$(ps -p $BUILD_PID -o %mem= 2>/dev/null | tr -d ' ')
    if [ ! -z "$MEM_USAGE" ]; then
        echo "   Mémoire utilisée: ${MEM_USAGE}%"
    fi
done

wait $BUILD_PID
BUILD_EXIT_CODE=$?

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Build réussi!"
    if [ -d ".next" ]; then
        echo "✅ Dossier .next créé"
    fi
elif [ $BUILD_EXIT_CODE -eq 124 ]; then
    echo ""
    echo "❌ Build timeout (15 minutes)"
    echo "   Vérifiez build.log pour les détails"
else
    echo ""
    echo "❌ Build échoué (code: $BUILD_EXIT_CODE)"
    echo ""
    echo "Dernières lignes du log:"
    tail -100 build.log | grep -A 5 -B 5 -i "error\|killed\|terminated\|out of memory" || tail -50 build.log
fi

echo ""
echo "=== FIN ==="
