#!/bin/bash
# Script pour lancer le build avec logs détaillés
# À exécuter sur le VPS: bash build-with-logs.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== BUILD AVEC LOGS DÉTAILLÉS ==="
echo ""

# Nettoyer le cache
echo "Nettoyage du cache..."
rm -rf .next

# Augmenter la limite de mémoire
export NODE_OPTIONS="--max-old-space-size=4096"

# Lancer le build avec logs détaillés
echo "Lancement du build..."
echo "Les logs seront sauvegardés dans build.log"
echo ""

npm run build 2>&1 | tee build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Build réussi!"
else
    echo ""
    echo "❌ Build échoué"
    echo ""
    echo "Dernières erreurs:"
    tail -100 build.log | grep -i error || tail -50 build.log
fi
