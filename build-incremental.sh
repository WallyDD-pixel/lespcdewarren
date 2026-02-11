#!/bin/bash
# Script pour builder de manière incrémentale et diagnostiquer les problèmes
# À exécuter sur le VPS: bash build-incremental.sh

cd /var/www/lespcdewarren/lespcdewarren || exit 1

echo "=== BUILD INCRÉMENTAL ==="
echo ""

# Nettoyer
rm -rf .next
rm -rf node_modules/.cache

# Vérifier Prisma
echo "1. Génération Prisma..."
npx prisma generate || exit 1
echo "✅ Prisma OK"
echo ""

# Vérifier TypeScript d'abord
echo "2. Vérification TypeScript..."
npx tsc --noEmit --incremental false 2>&1 | tee ts-errors.log
TS_EXIT=${PIPESTATUS[0]}
if [ $TS_EXIT -ne 0 ]; then
    echo "❌ Erreurs TypeScript détectées"
    echo "Vérifiez ts-errors.log"
    exit 1
fi
echo "✅ TypeScript OK"
echo ""

# Essayer de builder avec moins de parallélisme
echo "3. Build avec optimisations mémoire..."
export NODE_OPTIONS="--max-old-space-size=1536"
export NODE_ENV=production

# Désactiver le cache Next.js pour éviter les problèmes
export NEXT_TELEMETRY_DISABLED=1

# Builder avec moins de workers
export NODE_OPTIONS="$NODE_OPTIONS --max-old-space-size=1536"

echo "Lancement du build (peut prendre du temps)..."
npm run build 2>&1 | tee build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo "✅ Build réussi!"
else
    echo ""
    echo "❌ Build échoué"
    echo ""
    echo "Analyse des erreurs:"
    if grep -i "killed\|terminated\|out of memory" build.log; then
        echo ""
        echo "⚠️  Problème de mémoire détecté"
        echo "   Le VPS n'a probablement pas assez de RAM"
        echo ""
        echo "Solutions possibles:"
        echo "  1. Augmenter la RAM du VPS"
        echo "  2. Créer un swap file (voir fix-build-memory.sh)"
        echo "  3. Builder sur une machine plus puissante et transférer .next"
    fi
    
    echo ""
    echo "Dernières erreurs:"
    tail -100 build.log | grep -i error | tail -20 || tail -50 build.log
fi
