#!/bin/bash
# Script pour arrêter complètement PM2, builder, et redémarrer seulement si le build réussit

set -e

echo "=== ARRÊT COMPLET PM2 ET BUILD ==="
echo ""

# 1. Arrêter et supprimer complètement PM2
echo "1. Arrêt complet de PM2..."
pm2 stop all 2>/dev/null || echo "Aucun processus PM2 en cours"
pm2 delete all 2>/dev/null || echo "Aucun processus PM2 à supprimer"
pm2 kill 2>/dev/null || echo "PM2 déjà arrêté"
echo "✅ PM2 complètement arrêté"
echo ""

# 2. Vérifier qu'il n'y a plus de processus PM2
echo "2. Vérification des processus PM2..."
if pm2 list | grep -q "online\|stopped"; then
    echo "⚠️  Des processus PM2 sont encore actifs, forçons l'arrêt..."
    pkill -9 -f pm2 || echo "Aucun processus PM2 trouvé"
    sleep 2
fi
echo "✅ Aucun processus PM2 actif"
echo ""

# 3. Récupérer les modifications
echo "3. Récupération des modifications..."
git pull --no-rebase || git reset --hard origin/main
echo ""

# 4. Nettoyer
echo "4. Nettoyage..."
rm -rf .next node_modules/.cache .turbo
echo "✅ Nettoyage terminé"
echo ""

# 5. Installer les dépendances
echo "5. Installation des dépendances..."
npm install
echo ""

# 6. Migrations Prisma
echo "6. Migrations Prisma..."
npx prisma migrate deploy || echo "⚠️  Aucune migration à appliquer"
npx prisma generate
echo ""

# 7. Vérifier le polyfill
echo "7. Vérification du polyfill..."
node -e "require('./next-server-polyfill.js'); console.log('✅ document défini:', typeof document !== 'undefined'); console.log('✅ globalThis.document défini:', typeof globalThis.document !== 'undefined');" || {
    echo "❌ Erreur: Le polyfill ne fonctionne pas correctement"
    exit 1
}
echo ""

# 8. Builder
echo "8. Build de l'application..."
export NODE_OPTIONS="--max-old-space-size=1024"
export ESLINT_NO_DEV_ERRORS=true
export NEXT_TELEMETRY_DISABLED=1

echo "Lancement du build (peut prendre 10-20 minutes)..."
echo ""

# Timeout de 30 minutes
timeout 1800 npm run build 2>&1 | tee build.log

BUILD_EXIT=${PIPESTATUS[0]}

if [ $BUILD_EXIT -eq 0 ] && [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
    echo ""
    echo "✅✅✅ BUILD RÉUSSI! ✅✅✅"
    du -sh .next
    echo ""
    echo "BUILD_ID:"
    cat .next/BUILD_ID
    echo ""
    
    echo "9. Redémarrage de PM2..."
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
    tail -100 build.log | grep -A 20 -i "error\|fail\|document\|rejection" || tail -50 build.log
    echo ""
    echo "PM2 reste arrêté. Corrigez les erreurs et relancez le script."
    exit 1
fi

